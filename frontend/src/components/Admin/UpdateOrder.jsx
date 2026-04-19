import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { useSnackbar } from 'notistack';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { clearErrors, getOrderDetails, updateOrder, createShipment, getTracking } from '../../actions/orderAction';
import { UPDATE_ORDER_RESET } from '../../constants/orderConstants';
import TrackStepper from '../Order/TrackStepper';
import Loading from './Loading';
import { Link } from 'react-router-dom';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import MetaData from '../Layouts/MetaData';
import axios from 'axios';

// Allowed next-status transitions for the admin
const STATUS_TRANSITIONS = {
    'Placed':           ['Confirmed', 'Cancelled'],
    'Confirmed':        ['Processing', 'Cancelled'],
    'Processing':       ['Shipped', 'Cancelled'],
    'Shipped':          ['In Transit'],
    'In Transit':       ['Out for Delivery'],
    'Out for Delivery': ['Delivered'],
    'Delivered':        [],
    'Cancelled':        [],
    'Return Requested': ['Return Approved'],
    'Return Approved':  ['Return Picked Up'],
    'Return Picked Up': ['Returned'],
    'Returned':         ['Refund Initiated'],
    'Refund Initiated': ['Refunded'],
    'Refunded':         [],
};

const UpdateOrder = () => {

    const dispatch = useDispatch();
    const { enqueueSnackbar } = useSnackbar();
    const params = useParams();

    const [status, setStatus] = useState("");

    const { order, error, loading } = useSelector((state) => state.orderDetails);
    const { isUpdated, error: updateError } = useSelector((state) => state.order);
    const { tracking } = useSelector((state) => state.tracking);
    const { loading: shipmentLoading, isCreated: shipmentCreated, error: shipmentError } = useSelector((state) => state.createShipment);

    // Return management
    const [returnAction, setReturnAction] = useState('');
    const [returnProcessing, setReturnProcessing] = useState(false);
    const [refundAmount, setRefundAmount] = useState('');

    useEffect(() => {
        if (error) { enqueueSnackbar(error, { variant: "error" }); dispatch(clearErrors()); }
        if (updateError) { enqueueSnackbar(updateError, { variant: "error" }); dispatch(clearErrors()); }
        if (shipmentError) { enqueueSnackbar(shipmentError, { variant: "error" }); dispatch(clearErrors()); }
        if (isUpdated) {
            enqueueSnackbar("Order updated successfully", { variant: "success" });
            dispatch({ type: UPDATE_ORDER_RESET });
            dispatch(getOrderDetails(params.id));
            dispatch(getTracking(params.id));
        }
        if (shipmentCreated) {
            enqueueSnackbar("Shipment created on Shiprocket", { variant: "success" });
            dispatch({ type: 'CREATE_SHIPMENT_RESET' });
            dispatch(getOrderDetails(params.id));
            dispatch(getTracking(params.id));
        }
    }, [dispatch, error, params.id, isUpdated, updateError, shipmentCreated, shipmentError, enqueueSnackbar]);

    useEffect(() => {
        dispatch(getOrderDetails(params.id));
        dispatch(getTracking(params.id));
    }, [dispatch, params.id]);

    const updateOrderSubmitHandler = (e) => {
        e.preventDefault();
        if (!status) return;
        const formData = new FormData();
        formData.set("status", status);
        dispatch(updateOrder(params.id, formData));
        setStatus("");
    };

    const handleCreateShipment = () => {
        dispatch(createShipment(params.id));
    };

    const handleReturnAction = async () => {
        if (!returnAction) return;
        setReturnProcessing(true);
        try {
            if (returnAction === 'approve' || returnAction === 'reject') {
                await axios.put(`/api/v1/admin/order/${params.id}/return`, { action: returnAction }, { headers: { 'Content-Type': 'application/json' } });
                enqueueSnackbar(`Return ${returnAction}d`, { variant: "success" });
            } else if (returnAction === 'complete') {
                const body = { refundAmount: Number(refundAmount) || 0 };
                await axios.put(`/api/v1/admin/order/${params.id}/return/complete`, body, { headers: { 'Content-Type': 'application/json' } });
                enqueueSnackbar("Return completed, refund initiated", { variant: "success" });
            }
            dispatch(getOrderDetails(params.id));
            dispatch(getTracking(params.id));
            setReturnAction('');
            setRefundAmount('');
        } catch (err) {
            enqueueSnackbar(err.response?.data?.message || 'Action failed', { variant: "error" });
        }
        setReturnProcessing(false);
    };

    const nextStatuses = order ? (STATUS_TRANSITIONS[order.orderStatus] || []) : [];
    const canCreateShipment = order && ['Confirmed', 'Processing'].includes(order.orderStatus) && !order.shipment?.shiprocketOrderId;
    const hasReturnRequest = order?.returnInfo?.requestedAt && ['Return Requested', 'Return Approved', 'Return Picked Up', 'Returned'].includes(order.orderStatus);

    const events = tracking?.trackingEvents || order?.trackingEvents || [];
    const shipment = tracking?.shipment || order?.shipment;

    return (
        <>
            <MetaData title="Admin: Update Order | Milaari" />

            {loading ? <Loading /> : (
                <>
                    {order && order.user && order.shippingInfo && (
                        <div className="flex flex-col gap-4">
                            <Link to="/admin/orders" className="ml-1 flex items-center gap-0 font-medium text-primary-blue uppercase"><ArrowBackIosIcon sx={{ fontSize: "18px" }} />Go Back</Link>

                            {/* ── Address + Status Update ── */}
                            <div className="flex flex-col sm:flex-row bg-white shadow-sm border border-gray-200 rounded-lg min-w-full">
                                <div className="sm:w-1/2 border-r">
                                    <div className="flex flex-col gap-3 my-8 mx-10">
                                        <h3 className="font-medium text-lg">Delivery Address</h3>
                                        <h4 className="font-medium">{order.user.name}</h4>
                                        <p className="text-sm">{`${order.shippingInfo.address}, ${order.shippingInfo.city}, ${order.shippingInfo.state} - ${order.shippingInfo.pincode}`}</p>
                                        <div className="flex gap-2 text-sm">
                                            <p className="font-medium">Email</p>
                                            <p>{order.user.email}</p>
                                        </div>
                                        <div className="flex gap-2 text-sm">
                                            <p className="font-medium">Phone Number</p>
                                            <p>{order.shippingInfo.phoneNo}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4 p-8 sm:w-1/2">
                                    {/* Status update form */}
                                    <form onSubmit={updateOrderSubmitHandler} className="flex flex-col gap-3">
                                        <h3 className="font-medium text-lg">Update Status</h3>
                                        <div className="flex gap-2">
                                            <p className="text-sm font-medium">Current:</p>
                                            <p className="text-sm font-semibold">{order.orderStatus}</p>
                                        </div>
                                        {nextStatuses.length > 0 && (
                                            <>
                                                <FormControl fullWidth sx={{ marginTop: 1 }}>
                                                    <InputLabel id="order-status-select-label">Status</InputLabel>
                                                    <Select
                                                        labelId="order-status-select-label"
                                                        id="order-status-select"
                                                        value={status}
                                                        label="Status"
                                                        onChange={(e) => setStatus(e.target.value)}
                                                    >
                                                        {nextStatuses.map((s) => (
                                                            <MenuItem key={s} value={s}>{s}</MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                                <button type="submit" className="bg-primary-orange p-2.5 text-white font-medium rounded shadow hover:shadow-lg">
                                                    Update
                                                </button>
                                            </>
                                        )}
                                    </form>

                                    {/* Create Shipment button */}
                                    {canCreateShipment && (
                                        <button
                                            onClick={handleCreateShipment}
                                            disabled={shipmentLoading}
                                            className="bg-blue-600 p-2.5 text-white font-medium rounded shadow hover:shadow-lg"
                                        >
                                            {shipmentLoading ? 'Creating...' : 'Create Shipment (Shiprocket)'}
                                        </button>
                                    )}

                                    {/* Shipment info */}
                                    {shipment?.courierName && (
                                        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                                            <p><strong>Courier:</strong> {shipment.courierName}</p>
                                            {shipment.awbCode && <p><strong>AWB:</strong> {shipment.awbCode}</p>}
                                            {shipment.trackingId && <p><strong>Tracking ID:</strong> {shipment.trackingId}</p>}
                                            {shipment.estimatedDelivery && <p><strong>EDD:</strong> {new Date(shipment.estimatedDelivery).toLocaleDateString('en-IN')}</p>}
                                        </div>
                                    )}

                                    {/* Return management */}
                                    {hasReturnRequest && (
                                        <div className="bg-amber-50 border border-amber-200 rounded p-3">
                                            <h4 className="font-medium text-sm mb-2">Return Management</h4>
                                            <p className="text-xs text-gray-600">Reason: {order.returnInfo.reason}</p>
                                            <p className="text-xs text-gray-600">Status: {order.returnInfo.status || order.orderStatus}</p>

                                            {order.orderStatus === 'Return Requested' && (
                                                <div className="flex gap-2 mt-3">
                                                    <button onClick={() => { setReturnAction('approve'); }} className="px-3 py-1.5 bg-green-500 text-white text-sm rounded">Approve</button>
                                                    <button onClick={() => { setReturnAction('reject'); }} className="px-3 py-1.5 bg-red-500 text-white text-sm rounded">Reject</button>
                                                </div>
                                            )}

                                            {['Returned'].includes(order.orderStatus) && (
                                                <div className="flex flex-col gap-2 mt-3">
                                                    <input
                                                        type="number"
                                                        placeholder="Refund amount"
                                                        value={refundAmount}
                                                        onChange={(e) => setRefundAmount(e.target.value)}
                                                        className="border rounded p-2 text-sm"
                                                    />
                                                    <button onClick={() => { setReturnAction('complete'); }} className="px-3 py-1.5 bg-indigo-500 text-white text-sm rounded">Complete Return & Refund</button>
                                                </div>
                                            )}

                                            {returnAction && (
                                                <div className="mt-2 flex gap-2">
                                                    <button onClick={handleReturnAction} disabled={returnProcessing} className="px-3 py-1.5 bg-primary-orange text-white text-sm rounded">
                                                        {returnProcessing ? 'Processing...' : `Confirm ${returnAction}`}
                                                    </button>
                                                    <button onClick={() => setReturnAction('')} className="px-3 py-1.5 border text-sm rounded">Cancel</button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Cancellation info */}
                                    {order.cancellation?.requestedAt && (
                                        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm">
                                            <p className="font-medium text-red-700">Order Cancelled</p>
                                            <p className="text-xs text-red-600">Reason: {order.cancellation.reason}</p>
                                            <p className="text-xs text-red-600">By: {order.cancellation.cancelledBy}</p>
                                            {order.cancellation.refundStatus && <p className="text-xs text-red-600">Refund: {order.cancellation.refundStatus}</p>}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ── Tracking timeline ── */}
                            <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
                                <h3 className="font-medium text-lg mb-2">Tracking Timeline</h3>
                                <TrackStepper
                                    trackingEvents={events}
                                    activeStatus={order.orderStatus}
                                    shipment={shipment}
                                    orderOn={order.createdAt}
                                    shippedAt={order.shippedAt}
                                    deliveredAt={order.deliveredAt}
                                    activeStep={
                                        order.orderStatus === "Delivered" ? 2 : order.orderStatus === "Shipped" ? 1 : 0
                                    }
                                />
                            </div>

                            {/* ── Order items ── */}
                            {order.orderItems && order.orderItems.map((item) => {
                                const { _id, image, name, price, quantity, isRefundable } = item;
                                return (
                                    <div className="flex flex-col sm:flex-row min-w-full shadow-sm border border-gray-200 rounded-lg bg-white px-2 py-5" key={_id}>
                                        <div className="flex flex-col sm:flex-row sm:w-1/2 gap-1">
                                            <div className="w-full sm:w-32 h-24">
                                                <img draggable="false" className="h-full w-full object-contain" src={image} alt={name} />
                                            </div>
                                            <div className="flex flex-col gap-1 overflow-hidden">
                                                <p className="text-sm">{name.length > 45 ? `${name.substring(0, 45)}...` : name}</p>
                                                <p className="text-xs text-primary-grey mt-2">Quantity: {quantity}</p>
                                                <p className="text-xs text-primary-grey">Price: ₹{price.toLocaleString()}</p>
                                                <span className="font-medium">Total: ₹{(quantity * price).toLocaleString()}</span>
                                                {isRefundable === false && (
                                                    <span className="text-xs text-red-500 mt-1">Non-refundable</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </>
    );
};

export default UpdateOrder;

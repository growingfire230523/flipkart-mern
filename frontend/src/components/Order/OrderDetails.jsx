import { useSnackbar } from 'notistack';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { clearErrors, getOrderDetails, cancelOrder, requestReturn, getTracking } from '../../actions/orderAction';
import Loader from '../Layouts/Loader';
import TrackStepper from './TrackStepper';
import CategoryNavBar from '../Layouts/CategoryNavBar';
import MetaData from '../Layouts/MetaData';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';

const CANCELLABLE = ['Placed', 'Confirmed', 'Processing'];
const RETURNABLE = ['Delivered'];

const OrderDetails = () => {

    const dispatch = useDispatch();
    const { enqueueSnackbar } = useSnackbar();
    const params = useParams();

    const { order, error, loading } = useSelector((state) => state.orderDetails);
    const { tracking } = useSelector((state) => state.tracking);
    const { loading: cancelLoading, isCancelled, error: cancelError } = useSelector((state) => state.cancelOrder);
    const { loading: returnLoading, isReturned, error: returnError } = useSelector((state) => state.returnOrder);

    // Cancel dialog
    const [cancelOpen, setCancelOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('');

    // Return dialog
    const [returnOpen, setReturnOpen] = useState(false);
    const [returnReason, setReturnReason] = useState('');
    const [returnImages, setReturnImages] = useState([]);

    useEffect(() => {
        if (error) { enqueueSnackbar(error, { variant: "error" }); dispatch(clearErrors()); }
        if (cancelError) { enqueueSnackbar(cancelError, { variant: "error" }); dispatch(clearErrors()); }
        if (returnError) { enqueueSnackbar(returnError, { variant: "error" }); dispatch(clearErrors()); }
        if (isCancelled) {
            enqueueSnackbar("Order cancelled successfully", { variant: "success" });
            dispatch({ type: 'CANCEL_ORDER_RESET' });
            dispatch(getOrderDetails(params.id));
            dispatch(getTracking(params.id));
        }
        if (isReturned) {
            enqueueSnackbar("Return request submitted", { variant: "success" });
            dispatch({ type: 'RETURN_ORDER_RESET' });
            dispatch(getOrderDetails(params.id));
            dispatch(getTracking(params.id));
        }
    }, [dispatch, error, cancelError, returnError, isCancelled, isReturned, params.id, enqueueSnackbar]);

    useEffect(() => {
        dispatch(getOrderDetails(params.id));
        dispatch(getTracking(params.id));
    }, [dispatch, params.id]);

    const handleCancel = () => {
        if (!cancelReason.trim()) {
            enqueueSnackbar("Please provide a reason", { variant: "warning" });
            return;
        }
        dispatch(cancelOrder(params.id, cancelReason));
        setCancelOpen(false);
        setCancelReason('');
    };

    const handleReturn = () => {
        if (!returnReason.trim()) {
            enqueueSnackbar("Please provide a reason", { variant: "warning" });
            return;
        }
        const fd = new FormData();
        fd.set('reason', returnReason);
        returnImages.forEach((f) => fd.append('images', f));
        dispatch(requestReturn(params.id, fd));
        setReturnOpen(false);
        setReturnReason('');
        setReturnImages([]);
    };

    const canCancel = order && CANCELLABLE.includes(order.orderStatus);
    const canReturn = order && RETURNABLE.includes(order.orderStatus) && !order.returnInfo?.requestedAt;
    const hasRefundableItem = order?.orderItems?.some((i) => i.isRefundable !== false);

    // Use tracking data from dedicated endpoint, or fall back to order's trackingEvents
    const events = tracking?.trackingEvents || order?.trackingEvents || [];
    const shipment = tracking?.shipment || order?.shipment;

    return (
        <>
            <MetaData title="Order Details | Lexi" />
            <CategoryNavBar />

            <main className="w-full mt-2">
                {loading ? <Loader /> : (
                    <>
                        {order && order.user && order.shippingInfo && (
                            <div className="flex flex-col gap-4 max-w-6xl mx-auto pb-8">

                                {/* ── Header row ── */}
                                <div className="flex flex-wrap items-center justify-between bg-white shadow rounded-sm px-6 py-4">
                                    <div>
                                        <p className="text-xs text-gray-500">Order ID: <span className="font-medium text-gray-800">{order._id}</span></p>
                                        <p className="text-xs text-gray-500 mt-1">Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                    </div>
                                    <div className="flex gap-2 mt-2 sm:mt-0">
                                        {canCancel && (
                                            <button
                                                onClick={() => setCancelOpen(true)}
                                                disabled={cancelLoading}
                                                className="px-4 py-2 text-sm border border-red-500 text-red-500 rounded hover:bg-red-50"
                                            >
                                                Cancel Order
                                            </button>
                                        )}
                                        {canReturn && hasRefundableItem && (
                                            <button
                                                onClick={() => setReturnOpen(true)}
                                                disabled={returnLoading}
                                                className="px-4 py-2 text-sm border border-amber-500 text-amber-600 rounded hover:bg-amber-50"
                                            >
                                                Request Return
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* ── Address + Tracking side-by-side ── */}
                                <div className="flex flex-col sm:flex-row gap-4">

                                    {/* Address card */}
                                    <div className="flex-1 bg-white shadow rounded-sm p-6">
                                        <h3 className="font-medium text-lg mb-3">Delivery Address</h3>
                                        <h4 className="font-medium">{order.user.name}</h4>
                                        <p className="text-sm text-gray-600">{`${order.shippingInfo.address}, ${order.shippingInfo.city}, ${order.shippingInfo.state} - ${order.shippingInfo.pincode}`}</p>
                                        <div className="flex gap-2 text-sm mt-2">
                                            <p className="font-medium">Email</p>
                                            <p>{order.user.email}</p>
                                        </div>
                                        <div className="flex gap-2 text-sm">
                                            <p className="font-medium">Phone</p>
                                            <p>{order.shippingInfo.phoneNo}</p>
                                        </div>
                                    </div>

                                    {/* Tracking timeline card */}
                                    <div className="flex-1 bg-white shadow rounded-sm p-6">
                                        <h3 className="font-medium text-lg mb-1">Order Tracking</h3>
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
                                </div>

                                {/* ── Return / Cancellation info banners ── */}
                                {order.cancellation?.requestedAt && (
                                    <div className="bg-red-50 border border-red-200 rounded-sm p-4">
                                        <p className="text-sm font-medium text-red-700">Order Cancelled</p>
                                        <p className="text-xs text-red-600">Reason: {order.cancellation.reason}</p>
                                        {order.cancellation.refundStatus && (
                                            <p className="text-xs text-red-600 mt-1">Refund: {order.cancellation.refundStatus}
                                                {order.cancellation.refundAmount > 0 && ` — ₹${order.cancellation.refundAmount.toLocaleString()}`}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {order.returnInfo?.requestedAt && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-sm p-4">
                                        <p className="text-sm font-medium text-amber-700">Return {order.returnInfo.status || 'Requested'}</p>
                                        <p className="text-xs text-amber-600">Reason: {order.returnInfo.reason}</p>
                                        {order.returnInfo.refundStatus && (
                                            <p className="text-xs text-amber-600 mt-1">Refund: {order.returnInfo.refundStatus}
                                                {order.returnInfo.refundAmount > 0 && ` — ₹${order.returnInfo.refundAmount.toLocaleString()}`}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* ── Order items ── */}
                                {order.orderItems && order.orderItems.map((item) => {
                                    const { _id, image, name, price, quantity, isRefundable } = item;
                                    return (
                                        <div className="flex flex-col sm:flex-row min-w-full shadow rounded-sm bg-white px-4 py-5" key={_id}>
                                            <div className="flex flex-col sm:flex-row sm:w-1/2 gap-2">
                                                <div className="w-full sm:w-32 h-20">
                                                    <img draggable="false" className="h-full w-full object-contain" src={image} alt={name} />
                                                </div>
                                                <div className="flex flex-col gap-1 overflow-hidden">
                                                    <p className="text-sm">{name.length > 60 ? `${name.substring(0, 60)}...` : name}</p>
                                                    <p className="text-xs text-gray-600 mt-2">Quantity: {quantity}</p>
                                                    <p className="text-xs text-gray-600">Price: ₹{price.toLocaleString()}</p>
                                                    <span className="font-medium">Total: ₹{(quantity * price).toLocaleString()}</span>
                                                    {isRefundable === false && (
                                                        <span className="text-xs text-red-500 mt-1">Non-refundable</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* ── Price summary ── */}
                                <div className="bg-white shadow rounded-sm p-6">
                                    <h3 className="font-medium text-lg mb-3">Price Details</h3>
                                    <div className="flex justify-between text-sm py-1">
                                        <span>Items Total</span>
                                        <span>₹{(order.totalPrice - (order.shippingPrice || 0) - (order.taxPrice || 0)).toLocaleString()}</span>
                                    </div>
                                    {order.shippingPrice > 0 && (
                                        <div className="flex justify-between text-sm py-1">
                                            <span>Shipping</span>
                                            <span>₹{order.shippingPrice.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {order.taxPrice > 0 && (
                                        <div className="flex justify-between text-sm py-1">
                                            <span>Tax</span>
                                            <span>₹{order.taxPrice.toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between font-medium text-base py-2 border-t mt-2">
                                        <span>Total</span>
                                        <span>₹{order.totalPrice.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* ── Cancel dialog ── */}
            <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Cancel Order</DialogTitle>
                <DialogContent>
                    <p className="text-sm text-gray-600 mb-3">Please tell us why you want to cancel this order.</p>
                    <TextField
                        autoFocus
                        fullWidth
                        multiline
                        rows={3}
                        label="Reason for cancellation"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <button onClick={() => setCancelOpen(false)} className="px-4 py-2 text-sm text-gray-600">Close</button>
                    <button onClick={handleCancel} disabled={cancelLoading} className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600">
                        {cancelLoading ? 'Cancelling...' : 'Confirm Cancel'}
                    </button>
                </DialogActions>
            </Dialog>

            {/* ── Return dialog ── */}
            <Dialog open={returnOpen} onClose={() => setReturnOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Request Return</DialogTitle>
                <DialogContent>
                    <p className="text-sm text-gray-600 mb-3">Describe the issue and upload images if applicable.</p>
                    <TextField
                        autoFocus
                        fullWidth
                        multiline
                        rows={3}
                        label="Reason for return"
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                        sx={{ mb: 2 }}
                    />
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => setReturnImages(Array.from(e.target.files))}
                        className="text-sm"
                    />
                    {returnImages.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">{returnImages.length} image(s) selected</p>
                    )}
                </DialogContent>
                <DialogActions>
                    <button onClick={() => setReturnOpen(false)} className="px-4 py-2 text-sm text-gray-600">Close</button>
                    <button onClick={handleReturn} disabled={returnLoading} className="px-4 py-2 text-sm bg-amber-500 text-white rounded hover:bg-amber-600">
                        {returnLoading ? 'Submitting...' : 'Submit Return'}
                    </button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default OrderDetails;

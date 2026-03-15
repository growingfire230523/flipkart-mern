import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSnackbar } from 'notistack';
import { clearErrors, deleteOrder, getAllOrders } from '../../actions/orderAction';
import { DELETE_ORDER_RESET } from '../../constants/orderConstants';
import Actions from './Actions';
import { formatDate } from '../../utils/functions';
import MetaData from '../Layouts/MetaData';
import BackdropLoader from '../Layouts/BackdropLoader';
import axios from 'axios';

const OrderTable = () => {

    const dispatch = useDispatch();
    const { enqueueSnackbar } = useSnackbar();

    const { orders, error } = useSelector((state) => state.allOrders);
    const { loading, isDeleted, error: deleteError } = useSelector((state) => state.order);

    const pageSizeOptions = useMemo(() => ([100, 500, 1000, 5000]), []);
    const [pageSize, setPageSize] = useState(100);
    const [page, setPage] = useState(0);

    const [keyword, setKeyword] = useState('');
    const [status, setStatus] = useState('');
    const [amountMin, setAmountMin] = useState('');
    const [amountMax, setAmountMax] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const [uploadingId, setUploadingId] = useState(null);

    useEffect(() => {
        setPage(0);
    }, [keyword, status, amountMin, amountMax, dateFrom, dateTo]);

    useEffect(() => {
        if (error) {
            enqueueSnackbar(error, { variant: "error" });
            dispatch(clearErrors());
        }
        if (deleteError) {
            enqueueSnackbar(deleteError, { variant: "error" });
            dispatch(clearErrors());
        }
        if (isDeleted) {
            enqueueSnackbar("Deleted Successfully", { variant: "success" });
            dispatch({ type: DELETE_ORDER_RESET });
        }
        dispatch(getAllOrders());
    }, [dispatch, error, deleteError, isDeleted, enqueueSnackbar]);

    const deleteOrderHandler = (id) => {
        dispatch(deleteOrder(id));
    }

    const rows = [];

    (orders || []).forEach((order) => {
        rows.push({
            id: order._id,
            itemsQty: order.orderItems?.length || 0,
            amount: Number(order.totalPrice || 0),
            orderOn: formatDate(order.createdAt),
            status: order.orderStatus,
            createdAt: order.createdAt,
            hasInvoice: Boolean(order.invoice?.url),
        });
    });

    const uploadInvoiceForOrder = async (orderId, file) => {
        if (!orderId || !file) return;

        const mime = String(file?.type || '').toLowerCase();
        if (mime !== 'application/pdf') {
            enqueueSnackbar('Only PDF invoices are supported.', { variant: 'warning' });
            return;
        }

        const form = new FormData();
        form.append('invoice', file);

        setUploadingId(orderId);
        try {
            await axios.put(`/api/v1/admin/order/${orderId}/invoice`, form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            enqueueSnackbar('Invoice uploaded.', { variant: 'success' });
            dispatch(getAllOrders());
        } catch (e) {
            const message =
                e?.response?.data?.message ||
                e?.response?.data?.error ||
                e?.message ||
                'Invoice upload failed.';
            enqueueSnackbar(message, { variant: 'error' });
        } finally {
            setUploadingId(null);
        }
    };

    rows.sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
    });

    const normalizedKeyword = String(keyword || '').trim().toLowerCase();

    const filteredRows = useMemo(() => {
        const min = amountMin === '' ? undefined : Number(amountMin);
        const max = amountMax === '' ? undefined : Number(amountMax);
        const minOk = Number.isFinite(min);
        const maxOk = Number.isFinite(max);

        const fromMs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : undefined;
        const toMs = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : undefined;

        return rows.filter((r) => {
            if (normalizedKeyword) {
                const hay = `${r.id || ''} ${r.status || ''} ${r.amount || ''} ${r.orderOn || ''}`.toLowerCase();
                if (!hay.includes(normalizedKeyword)) return false;
            }

            if (status && String(r.status) !== String(status)) return false;

            if (minOk && !(r.amount >= min)) return false;
            if (maxOk && !(r.amount <= max)) return false;

            const created = r.createdAt ? new Date(r.createdAt).getTime() : undefined;
            if (fromMs !== undefined && created !== undefined && created < fromMs) return false;
            if (toMs !== undefined && created !== undefined && created > toMs) return false;

            return true;
        });
    }, [rows, normalizedKeyword, status, amountMin, amountMax, dateFrom, dateTo]);

    const totalCount = filteredRows.length;
    const safePageSize = Number(pageSize) > 0 ? Number(pageSize) : 100;
    const totalPages = safePageSize > 0 ? Math.max(1, Math.ceil(totalCount / safePageSize)) : 1;
    const safePage = Math.min(Math.max(0, page), Math.max(0, totalPages - 1));
    const from = totalCount === 0 ? 0 : safePage * safePageSize + 1;
    const to = totalCount === 0 ? 0 : Math.min((safePage + 1) * safePageSize, totalCount);

    const pageRows = filteredRows.slice(safePage * safePageSize, (safePage + 1) * safePageSize);

    const renderStatusPill = (status) => {
        if (status === 'Delivered') {
            return <span className="text-sm bg-primary-green/10 p-1 px-2 font-medium rounded-full text-primary-green">{status}</span>;
        }
        if (status === 'Shipped') {
            return <span className="text-sm bg-primary-yellow/15 p-1 px-2 font-medium rounded-full text-primary-darkBlue">{status}</span>;
        }
        return <span className="text-sm bg-primary-orange/10 p-1 px-2 font-medium rounded-full text-primary-blue">{status || 'Processing'}</span>;
    };

    return (
        <>
            <MetaData title="Admin Orders | Flipkart" />

            {loading && <BackdropLoader />}

            <h1 className="text-lg font-medium uppercase">orders</h1>

            <div className="flex items-center justify-between mt-4 mb-2">
                <div className="flex items-center gap-2 text-sm text-primary-grey">
                    <span className="font-medium text-primary-darkBlue">Show</span>
                    <select
                        value={pageSize}
                        onChange={(e) => {
                            const next = Number(e.target.value);
                            setPage(0);
                            setPageSize(next);
                        }}
                        className="border border-gray-200 rounded-md px-2 py-1 bg-white/80 text-primary-darkBlue"
                    >
                        {pageSizeOptions.map((n) => (
                            <option key={n} value={n}>{n}</option>
                        ))}
                    </select>
                    <span>orders per page</span>
                </div>

                <div className="text-sm text-primary-grey">
                    <span className="font-medium text-primary-darkBlue">{from}-{to}</span>
                    <span> of </span>
                    <span className="font-medium text-primary-darkBlue">{totalCount}</span>
                </div>
            </div>

            <div className="bg-white/70 border border-gray-200 rounded-xl shadow-sm px-3 py-3 mb-3">
                <div className="flex flex-col lg:flex-row gap-3">
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-primary-grey mb-1">Search</label>
                        <input
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            placeholder="Search by order ID"
                            className="w-full border border-gray-200 rounded-md px-3 py-2 bg-white/80 text-primary-darkBlue"
                        />
                    </div>

                    <div className="min-w-[220px]">
                        <label className="block text-xs font-medium text-primary-grey mb-1">Status</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full border border-gray-200 rounded-md px-3 py-2 bg-white/80 text-primary-darkBlue"
                        >
                            <option value="">All</option>
                            <option value="Processing">Processing</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Delivered">Delivered</option>
                        </select>
                    </div>

                    <div className="min-w-[260px]">
                        <label className="block text-xs font-medium text-primary-grey mb-1">Amount Range</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={amountMin}
                                onChange={(e) => setAmountMin(e.target.value)}
                                placeholder="Min"
                                className="w-full border border-gray-200 rounded-md px-3 py-2 bg-white/80 text-primary-darkBlue"
                            />
                            <input
                                type="number"
                                value={amountMax}
                                onChange={(e) => setAmountMax(e.target.value)}
                                placeholder="Max"
                                className="w-full border border-gray-200 rounded-md px-3 py-2 bg-white/80 text-primary-darkBlue"
                            />
                        </div>
                    </div>

                    <div className="min-w-[300px]">
                        <label className="block text-xs font-medium text-primary-grey mb-1">Date Range</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="w-full border border-gray-200 rounded-md px-3 py-2 bg-white/80 text-primary-darkBlue"
                            />
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="w-full border border-gray-200 rounded-md px-3 py-2 bg-white/80 text-primary-darkBlue"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white/80 border border-gray-200 rounded-xl shadow-sm w-full flex flex-col">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="sticky top-0 bg-white/90 backdrop-blur border-b border-gray-200">
                            <tr className="text-left text-primary-darkBlue">
                                <th className="px-4 py-3 whitespace-nowrap">Order ID</th>
                                <th className="px-4 py-3 whitespace-nowrap">Status</th>
                                <th className="px-4 py-3 whitespace-nowrap">Items Qty</th>
                                <th className="px-4 py-3 whitespace-nowrap">Amount</th>
                                <th className="px-4 py-3 whitespace-nowrap">Order On</th>
                                <th className="px-4 py-3 whitespace-nowrap">Upload Invoice</th>
                                <th className="px-4 py-3 whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100">
                            {pageRows.map((row) => (
                                <tr key={row.id} className="hover:bg-primary-pink/5">
                                    <td className="px-4 py-3 text-primary-grey whitespace-nowrap">{row.id}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">{renderStatusPill(row.status)}</td>
                                    <td className="px-4 py-3 text-primary-grey whitespace-nowrap">{row.itemsQty}</td>
                                    <td className="px-4 py-3 text-primary-grey whitespace-nowrap">₹{Number(row.amount || 0).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-primary-grey whitespace-nowrap">{row.orderOn}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <label className={
                                            `inline-flex items-center gap-2 px-3 py-1.5 rounded border text-xs cursor-pointer ` +
                                            (uploadingId === row.id
                                                ? 'border-gray-300 text-gray-400 cursor-wait'
                                                : 'border-primary-blue text-primary-blue hover:bg-primary-blue/5')
                                        }>
                                            <input
                                                type="file"
                                                accept="application/pdf"
                                                className="hidden"
                                                disabled={uploadingId === row.id}
                                                onChange={(e) => {
                                                    const f = e.target.files && e.target.files[0];
                                                    // reset to allow re-upload of same file
                                                    e.target.value = '';
                                                    uploadInvoiceForOrder(row.id, f);
                                                }}
                                            />
                                            {uploadingId === row.id ? 'Uploading...' : (row.hasInvoice ? 'Replace' : 'Upload')}
                                        </label>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <Actions editRoute={"order"} deleteHandler={deleteOrderHandler} id={row.id} />
                                    </td>
                                </tr>
                            ))}

                            {filteredRows.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-10 text-center text-primary-grey">
                                        No orders found.
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-end gap-2 px-4 py-2 border-t border-gray-200 bg-white/70">
                    <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={safePage <= 0}
                        className="px-3 py-1.5 rounded border border-gray-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Prev
                    </button>
                    <span className="text-sm text-primary-grey">Page <span className="font-medium text-primary-darkBlue">{safePage + 1}</span> / <span className="font-medium text-primary-darkBlue">{totalPages}</span></span>
                    <button
                        type="button"
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={safePage >= totalPages - 1}
                        className="px-3 py-1.5 rounded border border-gray-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                </div>
            </div>
        </>
    );
};

export default OrderTable;

import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSnackbar } from 'notistack';
import { clearErrors, getAllOrders } from '../../actions/orderAction';
import { formatDate } from '../../utils/functions';
import MetaData from '../Layouts/MetaData';
import BackdropLoader from '../Layouts/BackdropLoader';

const SalesTable = () => {

    const dispatch = useDispatch();
    const { enqueueSnackbar } = useSnackbar();

    const { orders, error } = useSelector((state) => state.allOrders);
    const { loading } = useSelector((state) => state.order);

    const pageSizeOptions = useMemo(() => ([100, 500, 1000, 5000]), []);
    const [pageSize, setPageSize] = useState(100);
    const [page, setPage] = useState(0);

    const [keyword, setKeyword] = useState('');
    const [amountMin, setAmountMin] = useState('');
    const [amountMax, setAmountMax] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    useEffect(() => {
        setPage(0);
    }, [keyword, amountMin, amountMax, dateFrom, dateTo]);

    useEffect(() => {
        if (error) {
            enqueueSnackbar(error, { variant: "error" });
            dispatch(clearErrors());
        }
        dispatch(getAllOrders());
    }, [dispatch, error, enqueueSnackbar]);

    const rows = [];

    (orders || []).forEach((order) => {
        rows.push({
            id: order._id,
            customerName: order.user?.name || '—',
            amount: Number(order.totalPrice || 0),
            trackingUrl: order.courier?.trackingUrl || '',
            paymentMethod: order.paymentInfo?.method === 'COD' ? 'COD' : 'Online Prepaid',
            orderOn: formatDate(order.createdAt),
            createdAt: order.createdAt,
        });
    });

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
                const hay = `${r.id || ''} ${r.customerName || ''} ${r.amount || ''} ${r.orderOn || ''}`.toLowerCase();
                if (!hay.includes(normalizedKeyword)) return false;
            }

            if (minOk && !(r.amount >= min)) return false;
            if (maxOk && !(r.amount <= max)) return false;

            const created = r.createdAt ? new Date(r.createdAt).getTime() : undefined;
            if (fromMs !== undefined && created !== undefined && created < fromMs) return false;
            if (toMs !== undefined && created !== undefined && created > toMs) return false;

            return true;
        });
    }, [rows, normalizedKeyword, amountMin, amountMax, dateFrom, dateTo]);

    const totalCount = filteredRows.length;
    const safePageSize = Number(pageSize) > 0 ? Number(pageSize) : 100;
    const totalPages = safePageSize > 0 ? Math.max(1, Math.ceil(totalCount / safePageSize)) : 1;
    const safePage = Math.min(Math.max(0, page), Math.max(0, totalPages - 1));
    const from = totalCount === 0 ? 0 : safePage * safePageSize + 1;
    const to = totalCount === 0 ? 0 : Math.min((safePage + 1) * safePageSize, totalCount);

    const pageRows = filteredRows.slice(safePage * safePageSize, (safePage + 1) * safePageSize);

    return (
        <>
            <MetaData title="Admin Sales | Milaari" />

            {loading && <BackdropLoader />}

            <h1 className="text-lg font-medium uppercase">sales</h1>

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
                            placeholder="Search by order ID or customer name"
                            className="w-full border border-gray-200 rounded-md px-3 py-2 bg-white/80 text-primary-darkBlue"
                        />
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
                                <th className="px-4 py-3 whitespace-nowrap">Customer Name</th>
                                <th className="px-4 py-3 whitespace-nowrap">Amount Received</th>
                                <th className="px-4 py-3 whitespace-nowrap">Shiprocket Bill</th>
                                <th className="px-4 py-3 whitespace-nowrap">Payment Method</th>
                                <th className="px-4 py-3 whitespace-nowrap">Date</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100">
                            {pageRows.map((row) => (
                                <tr key={row.id} className="hover:bg-primary-pink/5">
                                    <td className="px-4 py-3 text-primary-grey whitespace-nowrap font-mono text-xs">{row.id}</td>
                                    <td className="px-4 py-3 text-primary-darkBlue whitespace-nowrap font-medium">{row.customerName}</td>
                                    <td className="px-4 py-3 text-primary-grey whitespace-nowrap">₹{Number(row.amount || 0).toLocaleString()}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        {row.trackingUrl
                                            ? <a href={row.trackingUrl} target="_blank" rel="noreferrer" className="text-primary-blue underline text-xs">View</a>
                                            : <span className="text-gray-400 text-xs">—</span>
                                        }
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                            row.paymentMethod === 'COD'
                                                ? 'bg-amber-100 text-amber-700'
                                                : 'bg-green-100 text-green-700'
                                        }`}>{row.paymentMethod}</span>
                                    </td>
                                    <td className="px-4 py-3 text-primary-grey whitespace-nowrap">{row.orderOn}</td>
                                </tr>
                            ))}

                            {filteredRows.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-10 text-center text-primary-grey">
                                        No sales found.
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

export default SalesTable;

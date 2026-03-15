import CircleIcon from '@mui/icons-material/Circle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { Link } from 'react-router-dom';
import { formatDate } from '../../utils/functions';

const STATUS_COLORS = {
    'Placed':            'text-blue-500',
    'Confirmed':         'text-blue-600',
    'Processing':        'text-yellow-500',
    'Shipped':           'text-orange-500',
    'In Transit':        'text-orange-400',
    'Out for Delivery':  'text-purple-500',
    'Delivered':         'text-green-600',
    'Cancelled':         'text-red-500',
    'Return Requested':  'text-amber-600',
    'Return Approved':   'text-amber-500',
    'Return Picked Up':  'text-amber-400',
    'Returned':          'text-gray-600',
    'Refund Initiated':  'text-indigo-500',
    'Refunded':          'text-green-500',
};

const STATUS_LABELS = {
    'Placed':            (d) => `Placed on ${formatDate(d)}`,
    'Confirmed':         () => 'Order confirmed',
    'Processing':        () => 'Being processed',
    'Shipped':           () => 'Shipped',
    'In Transit':        () => 'In transit',
    'Out for Delivery':  () => 'Out for delivery',
    'Delivered':         (_, dd) => `Delivered on ${formatDate(dd)}`,
    'Cancelled':         () => 'Cancelled',
    'Return Requested':  () => 'Return requested',
    'Return Approved':   () => 'Return approved',
    'Return Picked Up':  () => 'Return picked up',
    'Returned':          () => 'Returned',
    'Refund Initiated':  () => 'Refund initiated',
    'Refunded':          () => 'Refunded',
};

const OrderItem = (props) => {

    const { orderId, name, image, price, quantity, createdAt, deliveredAt, orderStatus, canDownloadInvoice } = props;

    const copyOrderId = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(String(orderId));
        } catch {
            // ignore
        }
    };

    const downloadInvoice = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!canDownloadInvoice) return;
        window.open(`/api/v1/order/${orderId}/invoice`, '_blank', 'noopener,noreferrer');
    };

    const dotColor = STATUS_COLORS[orderStatus] || 'text-gray-400';
    const statusLabel = (STATUS_LABELS[orderStatus] || (() => orderStatus))(createdAt, deliveredAt);

    return (
        <Link to={`/order_details/${orderId}`} className="flex p-4 items-start bg-white border rounded gap-2 sm:gap-0 hover:shadow-lg">
            {/* image */}
            <div className="w-full sm:w-32 h-20">
                <img draggable="false" className="h-full w-full object-contain" src={image} alt={name} />
            </div>

            {/* order desc */}
            <div className="flex flex-col sm:flex-row justify-between w-full">

                <div className="flex flex-col gap-1 overflow-hidden">
                    <p className="text-sm">{name.length > 40 ? `${name.substring(0, 40)}...` : name}</p>
                    <p className="text-xs text-gray-500 mt-2">Quantity: {quantity}</p>
                    <p className="text-xs text-gray-500">Total: ₹{(quantity * price).toLocaleString()}</p>
                </div>

                <div className="flex flex-col sm:flex-row mt-1 sm:mt-0 gap-2 sm:gap-10 sm:items-start sm:justify-end">
                    <p className="text-sm sm:mt-0.5">₹{price.toLocaleString()}</p>

                    <div className="flex flex-col gap-1.5">
                        <p className="text-sm font-medium flex items-center gap-1">
                            <span className={`${dotColor} pb-0.5`}>
                                <CircleIcon sx={{ fontSize: "14px" }} />
                            </span>
                            {statusLabel}
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:items-end sm:ml-auto">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                            <span className="font-medium text-gray-600">ORDER_ID:</span>
                            <span className="truncate max-w-[160px]" title={orderId}>{orderId}</span>
                            <button
                                type="button"
                                onClick={copyOrderId}
                                className="p-1 rounded hover:bg-black/5"
                                aria-label="Copy Order ID"
                                title="Copy"
                            >
                                <ContentCopyIcon sx={{ fontSize: '16px' }} />
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={downloadInvoice}
                            disabled={!canDownloadInvoice}
                            className={
                                `flex items-center gap-1 px-2 py-1 border rounded text-xs ` +
                                (canDownloadInvoice
                                    ? 'text-primary-blue border-primary-blue hover:bg-primary-blue/5'
                                    : 'text-gray-400 border-gray-300 cursor-not-allowed')
                            }
                            title={canDownloadInvoice ? 'Download Invoice' : 'Invoice available after delivery + payment'}
                        >
                            <ReceiptLongIcon sx={{ fontSize: '16px' }} />
                            Download invoice
                        </button>
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default OrderItem;

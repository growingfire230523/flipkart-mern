import CircleIcon from '@mui/icons-material/Circle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import InventoryIcon from '@mui/icons-material/Inventory';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import PaymentIcon from '@mui/icons-material/Payment';
import PendingIcon from '@mui/icons-material/Pending';

const STATUS_META = {
    'Placed':            { color: 'text-blue-500',    icon: CircleIcon },
    'Confirmed':         { color: 'text-blue-600',    icon: CheckCircleIcon },
    'Processing':        { color: 'text-yellow-500',  icon: PendingIcon },
    'Shipped':           { color: 'text-orange-500',  icon: InventoryIcon },
    'In Transit':        { color: 'text-orange-400',  icon: LocalShippingIcon },
    'Out for Delivery':  { color: 'text-purple-500',  icon: LocalShippingIcon },
    'Delivered':         { color: 'text-green-600',   icon: CheckCircleIcon },
    'Cancelled':         { color: 'text-red-500',     icon: CancelIcon },
    'Return Requested':  { color: 'text-amber-600',   icon: AssignmentReturnIcon },
    'Return Approved':   { color: 'text-amber-500',   icon: AssignmentReturnIcon },
    'Return Picked Up':  { color: 'text-amber-400',   icon: LocalShippingIcon },
    'Returned':          { color: 'text-gray-600',    icon: AssignmentReturnIcon },
    'Refund Initiated':  { color: 'text-indigo-500',  icon: PaymentIcon },
    'Refunded':          { color: 'text-green-500',   icon: PaymentIcon },
};

const formatDateTime = (dt) => {
    if (!dt) return '';
    const d = new Date(dt);
    if (isNaN(d)) return '';
    const date = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${date}, ${time}`;
};

/**
 * Flipkart-style vertical tracking timeline.
 *
 * Props:
 *  - trackingEvents: [{ status, label, location, timestamp }]  (from backend)
 *  - activeStatus: current order status string
 *  - shipment: { courierName, trackingId, awbCode, estimatedDelivery, courierPhone }
 *
 * Falls back to legacy 3-step mode when trackingEvents is empty.
 */
const TrackStepper = ({ trackingEvents = [], activeStatus, shipment, orderOn, shippedAt, deliveredAt, activeStep }) => {

    // ── Legacy fallback (old 3-step mode) ──
    if (!trackingEvents || trackingEvents.length === 0) {
        const legacySteps = [
            { status: 'Placed', label: 'Order placed', timestamp: orderOn },
            { status: 'Shipped', label: 'Shipped', timestamp: shippedAt },
            { status: 'Delivered', label: 'Delivered', timestamp: deliveredAt },
        ];
        const legacyActive = activeStep ?? 0;

        return (
            <div className="flex flex-col gap-0 py-4 pl-2">
                {legacySteps.map((evt, idx) => {
                    const isComplete = idx <= legacyActive;
                    const isLast = idx === legacySteps.length - 1;
                    return (
                        <div key={idx} className="flex items-stretch gap-3">
                            {/* dot + line */}
                            <div className="flex flex-col items-center">
                                <span className={isComplete ? 'text-green-600' : 'text-gray-300'}>
                                    <CircleIcon sx={{ fontSize: '14px' }} />
                                </span>
                                {!isLast && (
                                    <div className={`w-0.5 flex-1 min-h-[40px] ${isComplete ? 'bg-green-600' : 'bg-gray-200'}`} />
                                )}
                            </div>
                            {/* content */}
                            <div className="pb-5">
                                <p className={`text-sm font-medium ${isComplete ? 'text-gray-900' : 'text-gray-400'}`}>{evt.status}</p>
                                {evt.timestamp && !isNaN(new Date(evt.timestamp)) && (
                                    <p className="text-xs text-gray-500">{formatDateTime(evt.timestamp)}</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    // ── Flipkart-style vertical timeline ──
    return (
        <div className="flex flex-col py-4 pl-2">
            {/* Shipment info banner */}
            {shipment?.courierName && (
                <div className="flex flex-wrap items-center gap-3 mb-4 px-3 py-2 bg-blue-50 rounded text-xs text-gray-700">
                    <span><strong>Courier:</strong> {shipment.courierName}</span>
                    {shipment.awbCode && <span><strong>AWB:</strong> {shipment.awbCode}</span>}
                    {shipment.estimatedDelivery && (
                        <span><strong>EDD:</strong> {formatDateTime(shipment.estimatedDelivery)}</span>
                    )}
                    {shipment.courierPhone && <span><strong>Contact:</strong> {shipment.courierPhone}</span>}
                </div>
            )}

            {/* Timeline events */}
            {trackingEvents.map((evt, idx) => {
                const meta = STATUS_META[evt.status] || { color: 'text-gray-500', icon: RadioButtonUncheckedIcon };
                const Icon = meta.icon;
                const isLast = idx === trackingEvents.length - 1;
                const isCurrent = isLast; // most recent event is the current state

                return (
                    <div key={idx} className="flex items-stretch gap-3">
                        {/* dot + connector line */}
                        <div className="flex flex-col items-center">
                            <span className={meta.color}>
                                <Icon sx={{ fontSize: isCurrent ? '18px' : '14px' }} />
                            </span>
                            {!isLast && (
                                <div className="w-0.5 flex-1 min-h-[36px] bg-gray-200" />
                            )}
                        </div>

                        {/* event content */}
                        <div className={`pb-4 ${isCurrent ? '' : 'opacity-80'}`}>
                            <p className={`text-sm font-semibold ${meta.color}`}>{evt.status}</p>
                            {evt.label && <p className="text-xs text-gray-700">{evt.label}</p>}
                            <div className="flex flex-wrap gap-3 mt-0.5">
                                {evt.timestamp && (
                                    <p className="text-xs text-gray-500">{formatDateTime(evt.timestamp)}</p>
                                )}
                                {evt.location && (
                                    <p className="text-xs text-gray-400">{evt.location}</p>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default TrackStepper;

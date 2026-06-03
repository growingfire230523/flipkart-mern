
const formatDeliveryLabel = (value) => {
    if (!value) return '';
    const dt = new Date(value);
    if (!Number.isNaN(dt.getTime())) {
        return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return String(value);
};

const PriceSidebar = ({ cartItems, shippingEstimate }) => {
    const itemsCount = cartItems.length;
    const itemsPrice = cartItems.reduce((sum, item) => sum + (item.cuttedPrice * item.quantity), 0);
    const itemsDiscount = cartItems.reduce((sum, item) => sum + ((item.cuttedPrice * item.quantity) - (item.price * item.quantity)), 0);
    const baseTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const rawShippingCharge = Number(shippingEstimate?.shippingCharge);
    const hasShippingCharge = Number.isFinite(rawShippingCharge);
    const shippingCharge = hasShippingCharge ? rawShippingCharge : 0;
    const isServiceable = shippingEstimate?.serviceable !== false;
    const deliveryLabel = formatDeliveryLabel(shippingEstimate?.estimatedDeliveryDate);
    const totalAmount = baseTotal + (isServiceable ? shippingCharge : 0);

    // shippingEstimate === null  → loading (fetch in progress)
    // shippingEstimate === undefined → not applicable (Shipping step, no estimate context)
    // shippingEstimate === object → loaded
    const estimateLoading = shippingEstimate === null;
    return (
        <div className="flex sticky top-16 sm:h-screen flex-col sm:w-4/12 sm:px-1">

            {/* <!-- nav tiles --> */}
            <div className="flex flex-col bg-white rounded-sm shadow">
                <h1 className="px-6 py-3 border-b font-medium text-gray-500">PRICE DETAILS</h1>

                <div className="flex flex-col gap-4 p-6 pb-3">
                    <p className="flex justify-between">Price ({itemsCount} item) <span>₹{itemsPrice.toLocaleString()}</span></p>
                    <p className="flex justify-between">Discount <span className="text-primary-green">- ₹{itemsDiscount.toLocaleString()}</span></p>
                    <p className="flex justify-between">Delivery Charges <span className={estimateLoading ? 'text-gray-400 animate-pulse' : 'text-primary-green'}>
                        {estimateLoading ? 'Calculating...' : !isServiceable ? 'Not serviceable' : hasShippingCharge ? (shippingCharge === 0 ? 'FREE' : `₹${shippingCharge.toLocaleString()}`) : '—'}
                    </span></p>
                    {deliveryLabel && (
                        <p className="flex justify-between text-xs text-primary-grey">Estimated delivery <span>{deliveryLabel}</span></p>
                    )}

                    <div className="border border-dashed"></div>
                    <p className="flex justify-between text-lg font-medium">Total Amount <span>₹{totalAmount.toLocaleString()}</span></p>
                    <div className="border border-dashed"></div>

                    <p className="font-medium text-primary-green">You will save ₹{itemsDiscount.toLocaleString()} on this order</p>

                </div>

            </div>
            {/* <!-- nav tiles --> */}

        </div>
    );
};

export default PriceSidebar;

import axios from 'axios';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import PriceSidebar from './PriceSidebar';
import Stepper from './Stepper';
import { emptyCart } from '../../actions/cartAction';
import { clearErrors, newOrder } from '../../actions/orderAction';
import { useSnackbar } from 'notistack';
import MetaData from '../Layouts/MetaData';

const Payment = () => {

    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    const [payDisable, setPayDisable] = useState(false);
    const [paymentMode, setPaymentMode] = useState('razorpay');
    const [codAvailable, setCodAvailable] = useState(true);
    const [codChecking, setCodChecking] = useState(false);

    const { shippingInfo, cartItems } = useSelector((state) => state.cart);
    const { user } = useSelector((state) => state.user);
    const { loading: orderLoading, order, error: orderError } = useSelector((state) => state.newOrder);

    const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Check COD availability based on pincode (Shiprocket serviceability)
    useEffect(() => {
        if (!shippingInfo?.pincode) return;
        setCodChecking(true);
        axios.get(`/api/v1/shipping/cod-check?pincode=${shippingInfo.pincode}`)
            .then(({ data }) => {
                setCodAvailable(data.codAvailable !== false);
            })
            .catch(() => {
                setCodAvailable(true); // Default to available on error
            })
            .finally(() => setCodChecking(false));
    }, [shippingInfo?.pincode]);

    // Load Razorpay script
    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            if (document.getElementById('razorpay-script')) {
                resolve(true);
                return;
            }
            const script = document.createElement('script');
            script.id = 'razorpay-script';
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    // Razorpay payment handler
    const handleRazorpayPayment = async (e) => {
        e.preventDefault();
        setPayDisable(true);

        try {
            const loaded = await loadRazorpayScript();
            if (!loaded) {
                enqueueSnackbar('Failed to load Razorpay. Check your internet connection.', { variant: 'error' });
                setPayDisable(false);
                return;
            }

            // Create Razorpay order on backend
            const { data } = await axios.post('/api/v1/payment/process', {
                amount: totalPrice,
            });

            const options = {
                key: data.key,
                amount: data.order.amount,
                currency: data.order.currency,
                name: 'Lexi',
                description: 'Order Payment',
                order_id: data.order.id,
                handler: async (response) => {
                    try {
                        // Verify payment on backend
                        const verifyRes = await axios.post('/api/v1/payment/verify', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            amount: totalPrice,
                        });

                        if (verifyRes.data.success) {
                            // Create the order
                            const orderData = {
                                shippingInfo,
                                orderItems: cartItems,
                                totalPrice,
                                whatsappTransactionalOptIn: Boolean(shippingInfo?.whatsappTransactionalOptIn),
                                paymentInfo: {
                                    id: response.razorpay_payment_id,
                                    status: 'PAID',
                                    method: 'razorpay',
                                    razorpayOrderId: response.razorpay_order_id,
                                },
                            };
                            dispatch(newOrder(orderData));
                        }
                    } catch (err) {
                        setPayDisable(false);
                        enqueueSnackbar('Payment verification failed.', { variant: 'error' });
                    }
                },
                prefill: {
                    name: user.name,
                    email: user.email,
                    contact: shippingInfo.phoneNo,
                },
                theme: {
                    color: '#2874f0',
                },
                modal: {
                    ondismiss: () => {
                        setPayDisable(false);
                    },
                },
            };

            const razorpay = new window.Razorpay(options);
            razorpay.on('payment.failed', (response) => {
                setPayDisable(false);
                enqueueSnackbar(response.error?.description || 'Payment failed.', { variant: 'error' });
            });
            razorpay.open();
        } catch (err) {
            setPayDisable(false);
            const message =
                err?.response?.data?.message ||
                err?.message ||
                'Payment request failed.';
            enqueueSnackbar(message, { variant: 'error' });
        }
    };

    // COD handler
    const codSubmitHandler = async (e) => {
        e.preventDefault();
        setPayDisable(true);

        const orderData = {
            shippingInfo,
            orderItems: cartItems,
            totalPrice,
            whatsappTransactionalOptIn: Boolean(shippingInfo?.whatsappTransactionalOptIn),
            paymentInfo: {
                id: `COD_${Date.now()}`,
                status: 'COD',
                method: 'COD',
            },
        };

        dispatch(newOrder(orderData));
    };

    // Handle order creation success/error
    useEffect(() => {
        if (orderError) {
            setPayDisable(false);
            dispatch(clearErrors());
            enqueueSnackbar(orderError, { variant: 'error' });
        }
    }, [dispatch, orderError, enqueueSnackbar]);

    useEffect(() => {
        if (!orderLoading && order) {
            enqueueSnackbar('Order Placed Successfully!', { variant: 'success' });
            dispatch(emptyCart());
            navigate('/orders/success');
        }
    }, [dispatch, enqueueSnackbar, navigate, order, orderLoading]);

    const optionClassName = (active) => {
        const base = 'w-full text-left px-6 py-5 border-b flex items-start gap-4 transition-colors';
        return active ? `${base} bg-primary-blue/5` : `${base} bg-white hover:bg-black/5`;
    };

    const OptionTitle = ({ children }) => (
        <div className="text-[16px] font-semibold text-black/90">{children}</div>
    );

    const OptionSub = ({ children }) => (
        <div className="text-[13px] text-primary-grey mt-1 leading-snug">{children}</div>
    );

    return (
        <>
            <MetaData title="Lexi: Secure Payment" />

            <main className="w-full mt-4">
                <div className="flex flex-col sm:flex-row gap-3.5 w-full sm:w-11/12 mt-0 sm:mt-4 m-auto sm:mb-7">
                    <div className="flex-1">
                        <Stepper activeStep={3}>
                            <div className="w-full bg-white">
                                <div className="flex flex-col md:flex-row">
                                    {/* Left rail — payment options */}
                                    <div className="w-full md:w-[360px] border-b md:border-b-0 md:border-r">
                                        <button
                                            type="button"
                                            className={optionClassName(paymentMode === 'razorpay')}
                                            onClick={() => setPaymentMode('razorpay')}
                                        >
                                            <div className="mt-1">
                                                <div className={`h-4 w-4 rounded-full border ${paymentMode === 'razorpay' ? 'border-primary-blue' : 'border-black/30'} flex items-center justify-center`}>
                                                    {paymentMode === 'razorpay' && <div className="h-2 w-2 rounded-full bg-primary-blue" />}
                                                </div>
                                            </div>
                                            <div>
                                                <OptionTitle>Razorpay</OptionTitle>
                                                <OptionSub>Pay via UPI, Cards, Net Banking, Wallets & more.</OptionSub>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            className={optionClassName(paymentMode === 'cod')}
                                            onClick={() => codAvailable && setPaymentMode('cod')}
                                            disabled={!codAvailable}
                                        >
                                            <div className="mt-1">
                                                <div className={`h-4 w-4 rounded-full border ${paymentMode === 'cod' ? 'border-primary-blue' : 'border-black/30'} flex items-center justify-center`}>
                                                    {paymentMode === 'cod' && <div className="h-2 w-2 rounded-full bg-primary-blue" />}
                                                </div>
                                            </div>
                                            <div>
                                                <OptionTitle>Cash on Delivery</OptionTitle>
                                                {codChecking ? (
                                                    <OptionSub>Checking availability...</OptionSub>
                                                ) : codAvailable ? (
                                                    <OptionSub>Pay when your order is delivered.</OptionSub>
                                                ) : (
                                                    <OptionSub>COD is not available for your pincode.</OptionSub>
                                                )}
                                            </div>
                                        </button>
                                    </div>

                                    {/* Right panel — payment form */}
                                    <div className="flex-1 p-6">
                                        {paymentMode === 'razorpay' && (
                                            <form onSubmit={handleRazorpayPayment} autoComplete="off" className="flex flex-col gap-4">
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        draggable="false"
                                                        className="h-7 object-contain"
                                                        src="https://razorpay.com/assets/razorpay-glyph.svg"
                                                        alt="Razorpay"
                                                    />
                                                    <div className="text-[15px] font-medium text-black/90">Pay securely with Razorpay</div>
                                                </div>
                                                <p className="text-sm text-gray-500">
                                                    UPI, Debit/Credit Cards, Net Banking, Wallets — all supported.
                                                </p>

                                                <input
                                                    type="submit"
                                                    value={`Pay ₹${totalPrice.toLocaleString()}`}
                                                    disabled={payDisable}
                                                    className={`${payDisable ? "bg-primary-grey cursor-not-allowed" : "bg-primary-orange cursor-pointer"} w-full sm:w-1/2 py-3 font-medium text-white shadow hover:shadow-lg rounded-sm uppercase outline-none`}
                                                />
                                            </form>
                                        )}

                                        {paymentMode === 'cod' && (
                                            <form onSubmit={codSubmitHandler} autoComplete="off" className="flex flex-col gap-4">
                                                <div className="text-[15px] font-medium text-black/90">Cash on Delivery</div>
                                                <p className="text-sm text-gray-500">
                                                    Place your order now and pay when it arrives.
                                                </p>

                                                <input
                                                    type="submit"
                                                    value="Place Order"
                                                    disabled={payDisable}
                                                    className={`${payDisable ? "bg-primary-grey cursor-not-allowed" : "bg-primary-orange cursor-pointer"} w-full sm:w-1/2 py-3 font-medium text-white shadow hover:shadow-lg rounded-sm uppercase outline-none`}
                                                />
                                            </form>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Stepper>
                    </div>

                    <PriceSidebar cartItems={cartItems} />
                </div>
            </main>
        </>
    );
};

export default Payment;
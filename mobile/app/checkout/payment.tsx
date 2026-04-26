import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../src/store';
import { createOrder, clearErrors, clearOrder } from '../../src/store/slices/orderSlice';
import { emptyCart } from '../../src/store/slices/cartSlice';
import { saveCartItemsToStorage, getActiveUserId } from '../../src/utils/cartStorage';
import {
  createRazorpayOrderApi,
  verifyRazorpayPaymentApi,
  codCheckApi,
} from '../../src/api/endpoints/payments';
import Toast from 'react-native-toast-message';

type PaymentMode = 'razorpay' | 'cod';

function getRazorpayNative() {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-razorpay').default as {
      open: (options: Record<string, unknown>) => Promise<Record<string, string>>;
    };
  } catch {
    return null;
  }
}

function normalizeRazorpaySuccess(data: Record<string, string>) {
  return {
    razorpay_payment_id:
      data.razorpay_payment_id || data.payment_id || data.razorpayPaymentId || '',
    razorpay_order_id: data.razorpay_order_id || data.order_id || data.razorpayOrderId || '',
    razorpay_signature: data.razorpay_signature || data.signature || '',
  };
}

export default function PaymentScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { cartItems, shippingInfo } = useSelector((state: RootState) => state.cart);
  const { user } = useSelector((state: RootState) => state.user);
  const [processing, setProcessing] = useState(false);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('razorpay');
  const [codAvailable, setCodAvailable] = useState(true);
  const [codChecking, setCodChecking] = useState(false);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 500 ? 0 : 40;
  const total = subtotal + shipping;

  const buildOrderItems = useCallback(
    () =>
      cartItems.map((item) => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
        product: item.product,
      })),
    [cartItems]
  );

  const submitOrder = useCallback(
    async (paymentInfo: { id: string; status: string; method: string; razorpayOrderId?: string }) => {
      const orderData = {
        shippingInfo,
        orderItems: buildOrderItems(),
        totalPrice: total,
        itemsPrice: subtotal,
        shippingPrice: shipping,
        whatsappTransactionalOptIn: Boolean((shippingInfo as { whatsappTransactionalOptIn?: boolean })?.whatsappTransactionalOptIn),
        paymentInfo,
      };
      await dispatch(createOrder(orderData)).unwrap();
      dispatch(emptyCart());
      const userId = await getActiveUserId();
      await saveCartItemsToStorage(userId, []);
      router.replace('/checkout/success');
    },
    [shippingInfo, buildOrderItems, total, subtotal, shipping, dispatch, router]
  );

  useEffect(() => {
    dispatch(clearOrder());
    dispatch(clearErrors());
  }, [dispatch]);

  useEffect(() => {
    const pin = shippingInfo?.pincode != null ? String(shippingInfo.pincode).trim() : '';
    if (!pin) return;
    setCodChecking(true);
    codCheckApi(pin)
      .then(({ data }) => {
        setCodAvailable(data.codAvailable !== false);
      })
      .catch(() => {
        setCodAvailable(true);
      })
      .finally(() => setCodChecking(false));
  }, [shippingInfo?.pincode]);

  const handleRazorpay = async () => {
    if (Platform.OS === 'web') {
      Toast.show({ type: 'error', text1: 'Razorpay is available on the iOS/Android app only.' });
      return;
    }

    const RazorpayCheckout = getRazorpayNative();
    if (!RazorpayCheckout) {
      Toast.show({
        type: 'error',
        text1: 'Razorpay native module missing',
        text2: 'Run npm install, then build with expo prebuild / EAS (not Expo Go).',
      });
      return;
    }

    setProcessing(true);
    try {
      const { data } = await createRazorpayOrderApi(total);
      const key = data.key as string;
      const rzOrder = data.order as { id: string; amount: number; currency: string };
      if (!key || !rzOrder?.id) {
        throw new Error(data?.message || 'Invalid payment session');
      }

      const phoneRaw = shippingInfo?.phoneNo != null ? String(shippingInfo.phoneNo) : '';
      const contactDigits = phoneRaw.replace(/\D/g, '').slice(-10);
      const e164Contact = contactDigits.length === 10 ? `91${contactDigits}` : phoneRaw;

      const options: Record<string, unknown> = {
        key,
        amount: rzOrder.amount,
        currency: rzOrder.currency || 'INR',
        name: 'Milaari',
        description: 'Order Payment',
        order_id: rzOrder.id,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: e164Contact || phoneRaw,
        },
        theme: { color: '#875c43' },
      };

      let response: Record<string, string>;
      try {
        response = (await RazorpayCheckout.open(options)) as Record<string, string>;
      } catch (err: unknown) {
        setProcessing(false);
        const e = err as { code?: string; description?: string; details?: { error?: { description?: string } } };
        const desc =
          e?.description ||
          e?.details?.error?.description ||
          (typeof err === 'object' && err && 'message' in err ? String((err as Error).message) : '') ||
          'Payment cancelled or failed';
        if (String(e?.code) !== '0') {
          Toast.show({ type: 'error', text1: desc });
        }
        return;
      }

      const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = normalizeRazorpaySuccess(response);
      if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        setProcessing(false);
        Toast.show({ type: 'error', text1: 'Incomplete payment response from Razorpay' });
        return;
      }

      await verifyRazorpayPaymentApi({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        amount: total,
        method: 'razorpay',
      });

      await submitOrder({
        id: razorpay_payment_id,
        status: 'PAID',
        method: 'razorpay',
        razorpayOrderId: razorpay_order_id,
      });
    } catch (err: unknown) {
      setProcessing(false);
      dispatch(clearErrors());
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (typeof err === 'string' ? err : '') ||
        (err instanceof Error ? err.message : '') ||
        'Payment failed';
      Toast.show({ type: 'error', text1: String(msg) });
    }
  };

  const handleCod = async () => {
    setProcessing(true);
    try {
      await submitOrder({
        id: `COD_${Date.now()}`,
        status: 'COD',
        method: 'COD',
      });
    } catch (err: unknown) {
      setProcessing(false);
      dispatch(clearErrors());
      const msg = typeof err === 'string' ? err : 'Order failed';
      Toast.show({ type: 'error', text1: msg });
    }
  };

  const onPayPress = () => {
    if (paymentMode === 'razorpay') handleRazorpay();
    else handleCod();
  };

  const optionRow = (active: boolean) =>
    `flex-row items-center bg-white rounded-xl p-4 mb-3 border ${active ? 'border-primary-blue' : 'border-gray-200'}`;

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Text className="text-lg text-primary-grey">←</Text>
        </Pressable>
        <Text className="text-xl font-brand-bold text-primary-darkBlue">Payment</Text>
      </View>

      <View className="px-4 mt-2">
        <Text className="text-sm font-roboto-bold text-gray-800 mb-3">Select payment method</Text>

        <Pressable onPress={() => setPaymentMode('razorpay')} className={optionRow(paymentMode === 'razorpay')}>
          <Text className="text-2xl mr-3">💳</Text>
          <View className="flex-1">
            <Text className="text-base font-roboto-medium text-gray-800">Razorpay</Text>
            <Text className="text-xs text-primary-grey mt-0.5 font-roboto">
              UPI, cards, net banking, wallets — same as lexi web checkout.
            </Text>
          </View>
          <View
            className={`w-5 h-5 rounded-full border-2 ${
              paymentMode === 'razorpay' ? 'border-primary-blue bg-primary-blue' : 'border-gray-300'
            }`}
          >
            {paymentMode === 'razorpay' ? <View className="w-2 h-2 rounded-full bg-white m-auto" /> : null}
          </View>
        </Pressable>

        <Pressable
          onPress={() => codAvailable && setPaymentMode('cod')}
          disabled={!codAvailable}
          className={`${optionRow(paymentMode === 'cod')} ${!codAvailable ? 'opacity-50' : ''}`}
        >
          <Text className="text-2xl mr-3">💵</Text>
          <View className="flex-1">
            <Text className="text-base font-roboto-medium text-gray-800">Cash on Delivery</Text>
            {codChecking ? (
              <Text className="text-xs text-primary-grey mt-0.5 font-roboto">Checking availability…</Text>
            ) : codAvailable ? (
              <Text className="text-xs text-primary-grey mt-0.5 font-roboto">Pay when your order is delivered.</Text>
            ) : (
              <Text className="text-xs text-orange-600 mt-0.5 font-roboto">COD is not available for your pincode.</Text>
            )}
          </View>
          <View
            className={`w-5 h-5 rounded-full border-2 ${
              paymentMode === 'cod' ? 'border-primary-blue bg-primary-blue' : 'border-gray-300'
            }`}
          >
            {paymentMode === 'cod' ? <View className="w-2 h-2 rounded-full bg-white m-auto" /> : null}
          </View>
        </Pressable>

        <View className="bg-white rounded-xl p-4 mt-2">
          <View className="flex-row justify-between mb-1">
            <Text className="text-sm text-gray-600 font-roboto">Subtotal</Text>
            <Text className="text-sm text-gray-800 font-roboto">₹{subtotal.toLocaleString('en-IN')}</Text>
          </View>
          <View className="flex-row justify-between mb-1">
            <Text className="text-sm text-gray-600 font-roboto">Shipping</Text>
            <Text className="text-sm text-gray-800 font-roboto">
              {shipping === 0 ? 'FREE' : `₹${shipping}`}
            </Text>
          </View>
          <View className="flex-row justify-between pt-2 border-t border-gray-100">
            <Text className="text-base font-roboto-bold text-primary-darkBlue">Total</Text>
            <Text className="text-base font-roboto-bold text-primary-darkBlue">
              ₹{total.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
      </View>

      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3" style={{ paddingBottom: 34 }}>
        <Pressable
          onPress={onPayPress}
          disabled={processing || (paymentMode === 'cod' && !codAvailable)}
          className={`py-3.5 rounded-xl items-center ${
            processing || (paymentMode === 'cod' && !codAvailable) ? 'bg-primary-grey' : 'bg-primary-blue'
          }`}
        >
          {processing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-roboto-bold text-base">
              {paymentMode === 'razorpay' ? `Pay ₹${total.toLocaleString('en-IN')}` : 'Place order'}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

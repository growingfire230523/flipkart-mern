import React, { useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Image } from 'expo-image';
import { AppDispatch, RootState } from '../../src/store';
import { fetchOrderDetails } from '../../src/store/slices/orderSlice';
import { formatDate } from '../../src/utils/functions';
import { documentDirectory, downloadAsync } from 'expo-file-system/legacy';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import Toast from 'react-native-toast-message';

const steps = ['Ordered', 'Shipped', 'Out for Delivery', 'Delivered'];

function TrackingStepper({ status, statusDates }: { status: string; statusDates?: any }) {
  const activeIndex = status === 'Delivered' ? 3 : status === 'Out for Delivery' ? 2 : status === 'Shipped' ? 1 : 0;

  return (
    <View className="flex-row items-center justify-between px-2 my-4">
      {steps.map((step, i) => (
        <View key={step} className="items-center flex-1">
          <View className={`w-6 h-6 rounded-full items-center justify-center ${
            i <= activeIndex ? 'bg-primary-blue' : 'bg-gray-200'
          }`}>
            {i <= activeIndex ? (
              <Text className="text-white text-xs">✓</Text>
            ) : (
              <View className="w-2 h-2 rounded-full bg-gray-400" />
            )}
          </View>
          <Text className={`text-[10px] mt-1 text-center ${i <= activeIndex ? 'text-primary-blue font-roboto-medium' : 'text-gray-400'}`}>
            {step}
          </Text>
          {statusDates?.[step] && (
            <Text className="text-[8px] text-gray-400 mt-0.5">{formatDate(statusDates[step])}</Text>
          )}
          {i < steps.length - 1 && (
            <View className={`absolute top-3 left-[60%] right-[-40%] h-0.5 ${
              i < activeIndex ? 'bg-primary-blue' : 'bg-gray-200'
            }`} />
          )}
        </View>
      ))}
    </View>
  );
}

export default function OrderDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const { orderDetail, loading } = useSelector((state: RootState) => state.order);

  useEffect(() => {
    if (id) dispatch(fetchOrderDetails(id));
  }, [id, dispatch]);

  const handleDownloadInvoice = async () => {
    try {
      const fileUri = `${documentDirectory}invoice-${id}.pdf`;
      const result = await downloadAsync(
        `${process.env.EXPO_PUBLIC_API_URL}/api/v1/order/${id}/invoice`,
        fileUri
      );
      if (result.status === 200) {
        const canShare = await isAvailableAsync();
        if (canShare) {
          await shareAsync(result.uri);
        } else {
          Toast.show({ type: 'success', text1: 'Invoice downloaded' });
        }
      } else {
        Toast.show({ type: 'error', text1: 'Failed to download invoice' });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Invoice not available' });
    }
  };

  if (loading || !orderDetail) {
    return (
      <SafeAreaView className="flex-1 bg-cream items-center justify-center">
        <ActivityIndicator color="#875c43" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Text className="text-lg text-primary-grey">←</Text>
        </Pressable>
        <Text className="text-xl font-brand-bold text-primary-darkBlue">Order Details</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        <View className="bg-white rounded-xl p-4 mb-3 shadow-sm">
          <Text className="text-xs text-gray-500 mb-1">Order #{orderDetail._id?.slice(-8).toUpperCase()}</Text>
          <Text className="text-xs text-gray-400">{formatDate(orderDetail.createdAt)}</Text>
          <TrackingStepper status={orderDetail.orderStatus} statusDates={orderDetail.statusDates} />
        </View>

        {/* Items */}
        <View className="bg-white rounded-xl p-4 mb-3 shadow-sm">
          <Text className="text-sm font-roboto-bold text-gray-800 mb-3">Items</Text>
          {orderDetail.orderItems?.map((item: any, i: number) => (
            <Pressable
              key={i}
              onPress={() => router.push(`/product/${item.product}`)}
              className="flex-row items-center mb-3"
            >
              <Image source={{ uri: item.image }} className="w-16 h-16 rounded-lg" contentFit="cover" />
              <View className="flex-1 ml-3">
                <Text className="text-sm text-gray-800" numberOfLines={2}>{item.name}</Text>
                <Text className="text-xs text-gray-500">{item.quantity} x ₹{item.price?.toLocaleString()}</Text>
              </View>
              <Text className="text-sm font-roboto-bold text-primary-darkBlue">
                ₹{(item.price * item.quantity).toLocaleString()}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Shipping */}
        <View className="bg-white rounded-xl p-4 mb-3 shadow-sm">
          <Text className="text-sm font-roboto-bold text-gray-800 mb-2">Shipping Address</Text>
          <Text className="text-sm text-gray-600">{orderDetail.shippingInfo?.address}</Text>
          <Text className="text-sm text-gray-600">
            {orderDetail.shippingInfo?.city}, {orderDetail.shippingInfo?.state} {orderDetail.shippingInfo?.pincode}
          </Text>
          <Text className="text-sm text-gray-600">Phone: {orderDetail.shippingInfo?.phoneNo}</Text>
        </View>

        {/* Payment */}
        <View className="bg-white rounded-xl p-4 mb-3 shadow-sm">
          <Text className="text-sm font-roboto-bold text-gray-800 mb-2">Payment</Text>
          <View className="flex-row justify-between mb-1">
            <Text className="text-sm text-gray-600">Items Total</Text>
            <Text className="text-sm text-gray-800">₹{orderDetail.itemsPrice?.toLocaleString()}</Text>
          </View>
          <View className="flex-row justify-between mb-1">
            <Text className="text-sm text-gray-600">Shipping</Text>
            <Text className="text-sm text-gray-800">
              {orderDetail.shippingPrice === 0 ? 'FREE' : `₹${orderDetail.shippingPrice}`}
            </Text>
          </View>
          <View className="flex-row justify-between pt-2 border-t border-gray-100">
            <Text className="text-base font-roboto-bold text-primary-darkBlue">Total</Text>
            <Text className="text-base font-roboto-bold text-primary-darkBlue">
              ₹{orderDetail.totalPrice?.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Download Invoice */}
        <Pressable onPress={handleDownloadInvoice} className="bg-white rounded-xl p-4 shadow-sm items-center">
          <Text className="text-sm font-roboto-bold text-primary-blue">Download Invoice</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

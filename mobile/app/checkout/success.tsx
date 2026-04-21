import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/store';

export default function OrderSuccessScreen() {
  const router = useRouter();
  const { order } = useSelector((state: RootState) => state.order);

  return (
    <SafeAreaView className="flex-1 bg-cream items-center justify-center px-8">
      <Text className="text-6xl mb-6">🎉</Text>
      <Text className="text-2xl font-brand-bold text-primary-darkBlue text-center mb-2">
        Order Placed Successfully!
      </Text>
      <Text className="text-sm text-primary-grey text-center mb-2">
        Thank you for your purchase
      </Text>
      {order?.order?._id && (
        <Text className="text-xs text-gray-500 mb-8">
          Order ID: {order.order._id}
        </Text>
      )}

      <Pressable
        onPress={() => router.push('/orders')}
        className="bg-primary-blue w-full py-3.5 rounded-xl items-center mb-3"
      >
        <Text className="text-white font-roboto-bold text-base">View My Orders</Text>
      </Pressable>

      <Pressable
        onPress={() => router.replace('/(tabs)')}
        className="border border-primary-blue w-full py-3.5 rounded-xl items-center"
      >
        <Text className="text-primary-blue font-roboto-bold text-base">Continue Shopping</Text>
      </Pressable>
    </SafeAreaView>
  );
}

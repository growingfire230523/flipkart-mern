import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { Image } from 'expo-image';
import { RootState } from '../../src/store';

export default function ConfirmScreen() {
  const router = useRouter();
  const { cartItems, shippingInfo } = useSelector((state: RootState) => state.cart);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 500 ? 0 : 40;
  const total = subtotal + shipping;

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Text className="text-lg text-primary-grey">←</Text>
        </Pressable>
        <Text className="text-xl font-brand-bold text-primary-darkBlue">Order Confirmation</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}>
        {/* Shipping Address */}
        <View className="bg-white rounded-xl p-4 mb-3 shadow-sm">
          <Text className="text-sm font-roboto-bold text-gray-800 mb-2">Shipping Address</Text>
          <Text className="text-sm text-gray-600">{shippingInfo.address}</Text>
          <Text className="text-sm text-gray-600">{shippingInfo.city}, {shippingInfo.state} {shippingInfo.pincode}</Text>
          <Text className="text-sm text-gray-600">Phone: {shippingInfo.phoneNo}</Text>
        </View>

        {/* Items */}
        <View className="bg-white rounded-xl p-4 mb-3 shadow-sm">
          <Text className="text-sm font-roboto-bold text-gray-800 mb-3">Order Items ({cartItems.length})</Text>
          {cartItems.map((item) => (
            <View key={item.cartItemId || item.product} className="flex-row items-center mb-3">
              <Image source={{ uri: item.image }} className="w-14 h-14 rounded-lg" contentFit="cover" />
              <View className="flex-1 ml-3">
                <Text className="text-sm text-gray-800" numberOfLines={1}>{item.name}</Text>
                <Text className="text-xs text-gray-500">{item.quantity} x ₹{item.price?.toLocaleString()}</Text>
              </View>
              <Text className="text-sm font-roboto-bold text-primary-darkBlue">
                ₹{(item.price * item.quantity).toLocaleString()}
              </Text>
            </View>
          ))}
        </View>

        {/* Price Summary */}
        <View className="bg-white rounded-xl p-4 shadow-sm">
          <Text className="text-sm font-roboto-bold text-gray-800 mb-3">Price Summary</Text>
          <View className="flex-row justify-between mb-2">
            <Text className="text-sm text-gray-600">Subtotal</Text>
            <Text className="text-sm text-gray-800">₹{subtotal.toLocaleString()}</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-sm text-gray-600">Shipping</Text>
            <Text className="text-sm text-gray-800">{shipping === 0 ? 'FREE' : `₹${shipping}`}</Text>
          </View>
          <View className="flex-row justify-between pt-2 border-t border-gray-100">
            <Text className="text-base font-roboto-bold text-primary-darkBlue">Total</Text>
            <Text className="text-base font-roboto-bold text-primary-darkBlue">₹{total.toLocaleString()}</Text>
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3" style={{ paddingBottom: 34 }}>
        <Pressable
          onPress={() => router.push('/checkout/payment')}
          className="bg-primary-orange py-3.5 rounded-xl items-center"
        >
          <Text className="text-white font-roboto-bold text-base">Proceed to Payment</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

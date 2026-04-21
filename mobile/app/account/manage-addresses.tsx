import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/store';

export default function ManageAddressesScreen() {
  const router = useRouter();
  const { shippingInfo } = useSelector((state: RootState) => state.cart);

  const hasAddress = shippingInfo && shippingInfo.address;

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Text className="text-lg text-primary-grey">←</Text>
        </Pressable>
        <Text className="text-xl font-brand-bold text-primary-darkBlue">Manage Addresses</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        {hasAddress ? (
          <View className="bg-white rounded-xl p-4 shadow-sm mb-3">
            <View className="flex-row justify-between items-start">
              <View className="flex-1">
                <Text className="text-sm font-roboto-bold text-gray-800 mb-1">Saved Address</Text>
                <Text className="text-sm text-gray-600">{shippingInfo.address}</Text>
                <Text className="text-sm text-gray-600">
                  {shippingInfo.city}, {shippingInfo.state} {shippingInfo.pincode}
                </Text>
                <Text className="text-sm text-gray-600">Phone: {shippingInfo.phoneNo}</Text>
              </View>
              <Pressable
                onPress={() => router.push('/checkout/shipping')}
                className="px-3 py-1.5 border border-primary-blue rounded-lg"
              >
                <Text className="text-xs text-primary-blue font-roboto-medium">Edit</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View className="items-center py-20">
            <Text className="text-4xl mb-3">📍</Text>
            <Text className="text-lg font-roboto-bold text-gray-800 mb-2">No saved addresses</Text>
            <Text className="text-sm text-gray-500 text-center mb-6">
              Add an address during checkout and it will appear here
            </Text>
            <Pressable
              onPress={() => router.push('/checkout/shipping')}
              className="bg-primary-blue px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-roboto-bold">Add Address</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

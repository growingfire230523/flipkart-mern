import React, { useEffect } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Image } from 'expo-image';
import { AppDispatch, RootState } from '../../src/store';
import { fetchMyOrders } from '../../src/store/slices/orderSlice';
import EmptyState from '../../src/components/ui/EmptyState';
import { formatDate } from '../../src/utils/functions';

const statusColors: Record<string, string> = {
  Processing: 'bg-yellow-100 text-yellow-700',
  Shipped: 'bg-blue-100 text-blue-700',
  Delivered: 'bg-green-100 text-green-700',
};

export default function OrdersScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { orders, loading } = useSelector((state: RootState) => state.order);

  useEffect(() => {
    dispatch(fetchMyOrders());
  }, [dispatch]);

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Text className="text-lg text-primary-grey">←</Text>
        </Pressable>
        <Text className="text-xl font-brand-bold text-primary-darkBlue">My Orders</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#875c43" className="mt-10" />
      ) : (
        <FlatList
          data={orders}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          ListEmptyComponent={<EmptyState title="No orders yet" subtitle="Start shopping to see your orders here" />}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/orders/${item._id}`)}
              className="bg-white rounded-xl p-4 mb-3 shadow-sm"
            >
              <View className="flex-row justify-between items-start mb-2">
                <View>
                  <Text className="text-xs text-gray-500">Order #{item._id.slice(-8).toUpperCase()}</Text>
                  <Text className="text-xs text-gray-400 mt-0.5">{formatDate(item.createdAt)}</Text>
                </View>
                <View className={`px-2.5 py-1 rounded-full ${statusColors[item.orderStatus] || 'bg-gray-100'}`}>
                  <Text className="text-xs font-roboto-medium">{item.orderStatus}</Text>
                </View>
              </View>

              <View className="flex-row">
                {item.orderItems?.slice(0, 3).map((orderItem: any, i: number) => (
                  <Image
                    key={i}
                    source={{ uri: orderItem.image }}
                    className="w-14 h-14 rounded-lg mr-2"
                    contentFit="cover"
                  />
                ))}
                {item.orderItems?.length > 3 && (
                  <View className="w-14 h-14 rounded-lg bg-gray-100 items-center justify-center">
                    <Text className="text-xs text-gray-500">+{item.orderItems.length - 3}</Text>
                  </View>
                )}
              </View>

              <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-gray-100">
                <Text className="text-sm text-gray-600">{item.orderItems?.length} items</Text>
                <Text className="text-base font-roboto-bold text-primary-darkBlue">₹{item.totalPrice?.toLocaleString()}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

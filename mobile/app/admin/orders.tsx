import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AdminGuard from '../../src/components/admin/AdminGuard';
import { getAdminOrdersApi } from '../../src/api/endpoints/admin';

function formatShortDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

export default function AdminOrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await getAdminOrdersApi();
    setOrders(Array.isArray(data?.orders) ? data.orders : []);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await load();
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <AdminGuard>
      <SafeAreaView className="flex-1 bg-cream" edges={['bottom']}>
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#875c43" />}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ListEmptyComponent={
            !loading ? (
              <Text className="text-center text-primary-grey font-roboto py-10">No orders</Text>
            ) : null
          }
          renderItem={({ item }) => {
            const amount = Number(item.totalPrice || 0);
            return (
              <Pressable
                onPress={() => router.push(`/orders/${item._id}` as any)}
                className="bg-white rounded-xl p-4 mb-3 border border-gray-100 shadow-sm"
              >
                <View className="flex-row justify-between items-start">
                  <Text className="text-xs text-primary-grey font-roboto">#{String(item._id).slice(-8)}</Text>
                  <Text className="text-xs font-roboto-bold text-primary-blue uppercase">{item.orderStatus || '—'}</Text>
                </View>
                <Text className="text-base font-roboto-bold text-primary-darkBlue mt-2">
                  ₹{amount.toLocaleString('en-IN')}
                </Text>
                <Text className="text-xs text-primary-grey mt-1 font-roboto">
                  {item.orderItems?.length || 0} items · {formatShortDate(item.createdAt)}
                </Text>
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </AdminGuard>
  );
}

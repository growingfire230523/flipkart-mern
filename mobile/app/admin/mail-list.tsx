import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminGuard from '../../src/components/admin/AdminGuard';
import { getAdminMailingListApi } from '../../src/api/endpoints/admin';

export default function AdminMailListScreen() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await getAdminMailingListApi();
    setEntries(Array.isArray(data?.entries) ? data.entries : []);
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
          data={entries}
          keyExtractor={(item) => item._id || item.email}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#875c43" />}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ListEmptyComponent={
            !loading ? (
              <Text className="text-center text-primary-grey font-roboto py-10">No subscribers</Text>
            ) : null
          }
          renderItem={({ item }) => (
            <View className="bg-white rounded-xl p-4 mb-3 border border-gray-100 shadow-sm">
              <Text className="text-sm font-roboto-bold text-primary-darkBlue">{item.email}</Text>
              {item.name ? (
                <Text className="text-xs text-primary-grey mt-1 font-roboto">{item.name}</Text>
              ) : null}
              {item.source ? (
                <Text className="text-[10px] text-primary-grey mt-2 font-roboto uppercase">Source: {item.source}</Text>
              ) : null}
            </View>
          )}
        />
      </SafeAreaView>
    </AdminGuard>
  );
}

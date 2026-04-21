import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminGuard from '../../src/components/admin/AdminGuard';
import { getAdminUsersApi } from '../../src/api/endpoints/admin';

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await getAdminUsersApi();
    setUsers(Array.isArray(data?.users) ? data.users : []);
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
          data={users}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#875c43" />}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ListEmptyComponent={
            !loading ? (
              <Text className="text-center text-primary-grey font-roboto py-10">No users</Text>
            ) : null
          }
          renderItem={({ item }) => (
            <View className="bg-white rounded-xl p-4 mb-3 border border-gray-100 shadow-sm">
              <Text className="text-base font-roboto-bold text-primary-darkBlue">{item.name}</Text>
              <Text className="text-sm text-primary-grey mt-1 font-roboto">{item.email}</Text>
              <View className="flex-row mt-2">
                <Text className="text-xs font-roboto-bold text-primary-blue uppercase bg-primary-blue/10 px-2 py-1 rounded-md">
                  {item.role || 'user'}
                </Text>
              </View>
            </View>
          )}
        />
      </SafeAreaView>
    </AdminGuard>
  );
}

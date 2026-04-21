import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TextInput, Pressable, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AdminGuard from '../../src/components/admin/AdminGuard';
import { getAdminProductsApi } from '../../src/api/endpoints/admin';
import { useDebounce } from '../../src/hooks/useDebounce';

export default function AdminProductsScreen() {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const debounced = useDebounce(keyword, 400);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const kw = debounced.trim();
    const params: Record<string, string> = { page: '1', limit: '80' };
    if (kw) params.keyword = kw;
    const { data } = await getAdminProductsApi(params);
    const list = data?.products;
    setProducts(Array.isArray(list) ? list : []);
  }, [debounced]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
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
        <View className="px-4 pt-2 pb-2">
          <TextInput
            value={keyword}
            onChangeText={setKeyword}
            placeholder="Search name or product ID…"
            placeholderTextColor="#9ca3af"
            className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-roboto text-gray-800"
          />
        </View>
        <FlatList
          data={products}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#875c43" />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          ListEmptyComponent={
            !loading ? (
              <Text className="text-center text-primary-grey font-roboto py-10">No products</Text>
            ) : null
          }
          renderItem={({ item }) => {
            const uri = item.images?.[0]?.url;
            const price = Number(item.price || 0);
            return (
              <Pressable
                onPress={() => router.push(`/product/${item._id}` as any)}
                className="flex-row bg-white rounded-xl p-3 mb-3 border border-gray-100 shadow-sm"
              >
                {uri ? (
                  <Image source={{ uri }} className="w-16 h-16 rounded-lg bg-gray-50" resizeMode="contain" />
                ) : (
                  <View className="w-16 h-16 rounded-lg bg-gray-100" />
                )}
                <View className="flex-1 ml-3">
                  <Text className="text-sm font-roboto-bold text-primary-darkBlue" numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text className="text-xs text-primary-grey mt-1 font-roboto">
                    {item.category}
                    {item.subCategory ? ` · ${item.subCategory}` : ''}
                  </Text>
                  <Text className="text-sm font-roboto-bold text-primary-blue mt-1">₹{price.toLocaleString('en-IN')}</Text>
                </View>
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </AdminGuard>
  );
}

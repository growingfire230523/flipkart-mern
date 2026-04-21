import React, { useEffect, useState } from 'react';
import { View, FlatList, Pressable, Text } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { getBestSellersApi } from '../../api/endpoints/products';
import RatingStars from '../ui/RatingStars';
import SectionHeader from '../ui/SectionHeader';

export default function BestSellerSection() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        console.log('[BestSellers] Fetching /api/v1/products/best-sellers?limit=8');
        const { data } = await getBestSellersApi();
        console.log('[BestSellers] Response: products=', data?.products?.length);
        if (mounted) setProducts(data?.products || []);
      } catch (err: any) {
        console.warn('[BestSellers] FAILED:', err?.message, err?.response?.status);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (!products.length) return null;

  return (
    <View>
      <SectionHeader title="Best Seller Items" onSeeAll={() => router.push('/products')} />
      <FlatList
        data={products}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/product/${item._id}`)}
            className="mr-3 bg-white rounded-xl overflow-hidden shadow-sm"
            style={{ width: 144 }}
          >
            <Image source={{ uri: item.images?.[0]?.url }} style={{ width: 144, height: 144 }} contentFit="cover" transition={200} />
            <View className="p-2">
              <Text className="text-xs font-roboto-medium text-gray-800" numberOfLines={1}>{item.name}</Text>
              <RatingStars rating={item.ratings} size={10} />
              <Text className="text-sm font-roboto-bold text-primary-darkBlue mt-1">₹{item.price?.toLocaleString()}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

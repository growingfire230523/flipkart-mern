import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { getNewInApi } from '../../api/endpoints/products';
import SectionHeader from '../ui/SectionHeader';
import RatingStars from '../ui/RatingStars';

export default function NewInSection() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        console.log('[NewIn] Fetching /api/v1/products/new-in?limit=3');
        const { data } = await getNewInApi();
        console.log('[NewIn] Response: products=', data?.products?.length);
        if (mounted) setProducts(data?.products || []);
      } catch (err: any) {
        console.warn('[NewIn] FAILED:', err?.message, err?.response?.status);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (!products.length) return null;

  return (
    <View>
      <SectionHeader title="New Arrivals" onSeeAll={() => router.push('/products')} />
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
            style={{ width: 160 }}
          >
            <View>
              <Image source={{ uri: item.images?.[0]?.url }} style={{ width: 160, height: 160 }} contentFit="cover" transition={200} />
              <View className="absolute top-2 left-2 bg-primary-orange rounded-md px-2 py-0.5">
                <Text className="text-white text-[10px] font-roboto-bold">NEW!</Text>
              </View>
            </View>
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

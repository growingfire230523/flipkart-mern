import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { getDealsApi } from '../../api/endpoints/banners';
import RatingStars from '../ui/RatingStars';
import SectionHeader from '../ui/SectionHeader';

function pad(n: number) { return String(n).padStart(2, '0'); }

export default function FlashDealSection() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        console.log('[FlashDeal] Fetching /api/v1/deals?limit=12');
        const { data } = await getDealsApi(12);
        console.log('[FlashDeal] Response: products=', data?.products?.length, 'endsAt=', data?.endsAt);
        if (!mounted) return;
        setProducts(Array.isArray(data?.products) ? data.products : []);
        if (data?.endsAt) setEndsAt(data.endsAt);
      } catch (err: any) {
        console.warn('[FlashDeal] FAILED:', err?.message, err?.response?.status);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) { setExpired(true); return; }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (!products.length || expired) return null;

  return (
    <View className="mt-2">
      <SectionHeader title="Flash Deals" />
      <View className="mx-4 mb-3 bg-primary-blue rounded-xl p-3 flex-row items-center justify-center">
        {[
          { label: 'Days', value: pad(timeLeft.days) },
          { label: 'Hrs', value: pad(timeLeft.hours) },
          { label: 'Min', value: pad(timeLeft.minutes) },
          { label: 'Sec', value: pad(timeLeft.seconds) },
        ].map((t) => (
          <View key={t.label} className="items-center mx-2">
            <Text className="text-white text-lg font-roboto-bold">{t.value}</Text>
            <Text className="text-white/70 text-[10px]">{t.label}</Text>
          </View>
        ))}
      </View>
      <FlatList
        data={products}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => {
          const disc = item.cuttedPrice > item.price
            ? Math.round(((item.cuttedPrice - item.price) / item.cuttedPrice) * 100)
            : 0;
          return (
            <Pressable
              onPress={() => router.push(`/product/${item._id}`)}
              className="mr-3 bg-white rounded-xl overflow-hidden shadow-sm"
              style={{ width: 144 }}
            >
              <View>
                <Image
                  source={{ uri: item.images?.[0]?.url }}
                  style={{ width: 144, height: 144 }}
                  contentFit="cover"
                  transition={200}
                />
                {disc > 0 && (
                  <View className="absolute top-2 right-2 bg-red-500 rounded-md px-1.5 py-0.5">
                    <Text className="text-white text-[10px] font-roboto-bold">{disc}% OFF</Text>
                  </View>
                )}
              </View>
              <View className="p-2">
                <Text className="text-xs font-roboto-medium text-gray-800" numberOfLines={1}>{item.name}</Text>
                <RatingStars rating={item.ratings} size={10} />
                <View className="flex-row items-center mt-1">
                  <Text className="text-sm font-roboto-bold text-primary-darkBlue">₹{item.price?.toLocaleString()}</Text>
                  {item.cuttedPrice > item.price && (
                    <Text className="text-[10px] text-gray-400 line-through ml-1">₹{item.cuttedPrice?.toLocaleString()}</Text>
                  )}
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

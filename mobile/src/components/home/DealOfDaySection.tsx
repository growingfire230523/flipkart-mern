import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { getDealsApi } from '../../api/endpoints/banners';

function pad(n: number) { return String(n).padStart(2, '0'); }

export default function DealOfDaySection() {
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [heroImage, setHeroImage] = useState('');
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        console.log('[DealOfDay] Fetching /api/v1/deals?limit=4');
        const { data } = await getDealsApi(4);
        console.log('[DealOfDay] Response: products=', data?.products?.length, 'heroImageUrl=', data?.heroImageUrl?.slice(0, 60));
        if (!mounted) return;
        const prods = Array.isArray(data?.products) ? data.products : [];
        if (prods.length) {
          setProduct(prods[0]);
          setHeroImage(data?.heroImageUrl || prods[0]?.images?.[0]?.url || '');
          setEndsAt(data?.dealOfDayEndsAt || data?.endsAt || null);
        }
      } catch (err: any) {
        console.warn('[DealOfDay] FAILED:', err?.message, err?.response?.status);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) return;
      setTimeLeft({
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (!product) return null;

  return (
    <View className="mx-4 my-3 bg-primary-blue rounded-2xl overflow-hidden">
      <View className="flex-row">
        <View className="flex-1 p-4 justify-center">
          <Text className="text-white/70 text-xs font-roboto-medium uppercase tracking-wider">Deal Of The Day</Text>
          <Text className="text-white text-lg font-brand-bold mt-1" numberOfLines={2}>{product.name}</Text>
          <Text className="text-white text-xl font-roboto-bold mt-2">₹{product.price?.toLocaleString()}</Text>
          <View className="flex-row mt-2">
            {[pad(timeLeft.hours), pad(timeLeft.minutes), pad(timeLeft.seconds)].map((v, i) => (
              <View key={i} className="bg-white/20 rounded px-2 py-1 mr-1">
                <Text className="text-white text-xs font-roboto-bold">{v}</Text>
              </View>
            ))}
          </View>
          <Pressable
            onPress={() => router.push(`/product/${product._id}`)}
            className="bg-white rounded-full px-4 py-2 mt-3 self-start"
          >
            <Text className="text-primary-blue text-xs font-roboto-bold">Shop the deal</Text>
          </Pressable>
        </View>
        {heroImage ? (
          <Image source={{ uri: heroImage }} style={{ width: 144, alignSelf: 'stretch' }} contentFit="cover" />
        ) : null}
      </View>
    </View>
  );
}

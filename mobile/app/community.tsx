import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { getTestimonialsApi } from '../src/api/endpoints/testimonials';
import { getCommunityBannerApi } from '../src/api/endpoints/banners';
import RatingStars from '../src/components/ui/RatingStars';

export default function CommunityScreen() {
  const router = useRouter();
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [banner, setBanner] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [testRes, bannerRes] = await Promise.allSettled([
        getTestimonialsApi(),
        getCommunityBannerApi(),
      ]);
      if (testRes.status === 'fulfilled') setTestimonials(testRes.value.data.testimonials || []);
      if (bannerRes.status === 'fulfilled') {
        const b = bannerRes.value.data.banner || bannerRes.value.data;
        if (b?.image?.url) setBanner(b);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Text className="text-lg text-primary-grey">←</Text>
        </Pressable>
        <Text className="text-xl font-brand-bold text-primary-darkBlue">Community</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        {banner && (
          <View className="rounded-xl overflow-hidden mb-4">
            <Image source={{ uri: banner.image.url }} className="w-full h-36" contentFit="cover" transition={300} />
          </View>
        )}

        <Text className="text-2xl font-brand-bold text-primary-darkBlue mb-1">What Our Customers Say</Text>
        <Text className="text-sm text-primary-grey mb-6">Real reviews from the LEXI community</Text>

        {loading ? (
          <ActivityIndicator color="#875c43" className="mt-10" />
        ) : (
          testimonials.map((t, i) => (
            <View key={i} className="bg-white rounded-xl p-4 mb-3 shadow-sm">
              <View className="flex-row items-center mb-2">
                {t.avatar ? (
                  <Image source={{ uri: t.avatar }} className="w-10 h-10 rounded-full mr-3" contentFit="cover" />
                ) : (
                  <View className="w-10 h-10 rounded-full bg-primary-blue/10 items-center justify-center mr-3">
                    <Text className="text-base font-roboto-bold text-primary-blue">
                      {t.name?.[0]?.toUpperCase() || '?'}
                    </Text>
                  </View>
                )}
                <View className="flex-1">
                  <Text className="text-sm font-roboto-bold text-gray-800">{t.name}</Text>
                  {t.rating && <RatingStars rating={t.rating} size={12} />}
                </View>
              </View>
              <Text className="text-sm text-gray-600 leading-5">{t.review || t.comment || t.text}</Text>
            </View>
          ))
        )}

        {!loading && testimonials.length === 0 && (
          <View className="items-center py-10">
            <Text className="text-lg font-roboto-bold text-gray-800">No testimonials yet</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

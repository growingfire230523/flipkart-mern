import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminGuard from '../../src/components/admin/AdminGuard';
import { getAdminHeroBannersApi, getAdminCommunityBannerApi } from '../../src/api/endpoints/admin';

export default function AdminBannersScreen() {
  const [loading, setLoading] = useState(true);
  const [hero, setHero] = useState<any[]>([]);
  const [community, setCommunity] = useState<any>(null);

  useEffect(() => {
    let m = true;
    (async () => {
      try {
        const [h, c] = await Promise.all([getAdminHeroBannersApi(), getAdminCommunityBannerApi()]);
        if (!m) return;
        const hb = h.data?.banners ?? h.data?.heroBanners ?? h.data;
        setHero(Array.isArray(hb) ? hb : []);
        setCommunity(c.data?.banner ?? c.data ?? null);
      } catch {
        if (m) {
          setHero([]);
          setCommunity(null);
        }
      } finally {
        if (m) setLoading(false);
      }
    })();
    return () => {
      m = false;
    };
  }, []);

  return (
    <AdminGuard>
      <SafeAreaView className="flex-1 bg-cream" edges={['bottom']}>
        {loading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color="#875c43" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            <Text className="text-sm font-roboto-bold text-primary-darkBlue mb-2">Hero banners</Text>
            {hero.length === 0 ? (
              <Text className="text-xs text-primary-grey font-roboto mb-6">No hero banners returned.</Text>
            ) : (
              hero.map((b: any, i: number) => {
                const uri = b?.image?.url || b?.url || b?.src;
                return (
                  <View key={b?._id || i} className="bg-white rounded-xl overflow-hidden mb-3 border border-gray-100 shadow-sm">
                    {uri ? (
                      <Image source={{ uri }} className="w-full h-36" resizeMode="cover" />
                    ) : null}
                    <Text className="text-xs text-primary-grey font-roboto p-3">{b?.title || b?.heading || `Banner ${i + 1}`}</Text>
                  </View>
                );
              })
            )}

            <Text className="text-sm font-roboto-bold text-primary-darkBlue mb-2 mt-4">Community banner</Text>
            {community?.image?.url || community?.url ? (
              <View className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                <Image
                  source={{ uri: community.image?.url || community.url }}
                  className="w-full h-32"
                  resizeMode="cover"
                />
              </View>
            ) : (
              <Text className="text-xs text-primary-grey font-roboto">No community banner configured.</Text>
            )}

            <Text className="text-xs text-primary-grey font-roboto mt-4 leading-5">
              Uploads and deletes use multipart endpoints on the web admin (`/api/v1/admin/home/hero-banners`, `/api/v1/admin/home/banner`).
            </Text>
          </ScrollView>
        )}
      </SafeAreaView>
    </AdminGuard>
  );
}

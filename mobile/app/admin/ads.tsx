import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminGuard from '../../src/components/admin/AdminGuard';
import {
  getAdminNewInAdsApi,
  getAdminPerfumePromoApi,
  getAdminMakeupPromoApi,
  getAdminSkincarePromoApi,
} from '../../src/api/endpoints/admin';

function Section({ title, data }: { title: string; data: any }) {
  const uri = data?.image?.url || data?.url;
  return (
    <View className="mb-6">
      <Text className="text-sm font-roboto-bold text-primary-darkBlue mb-2">{title}</Text>
      {uri ? (
        <View className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm">
          <Image source={{ uri }} className="w-full h-28" resizeMode="cover" />
        </View>
      ) : (
        <Text className="text-xs text-primary-grey font-roboto">Not set or empty response.</Text>
      )}
    </View>
  );
}

export default function AdminAdsScreen() {
  const [loading, setLoading] = useState(true);
  const [newIn, setNewIn] = useState<any>(null);
  const [perfume, setPerfume] = useState<any>(null);
  const [makeup, setMakeup] = useState<any>(null);
  const [skincare, setSkincare] = useState<any>(null);

  useEffect(() => {
    let m = true;
    (async () => {
      try {
        const [n, p, mk, sk] = await Promise.all([
          getAdminNewInAdsApi(),
          getAdminPerfumePromoApi(),
          getAdminMakeupPromoApi(),
          getAdminSkincarePromoApi(),
        ]);
        if (!m) return;
        setNewIn(n.data);
        setPerfume(p.data);
        setMakeup(mk.data);
        setSkincare(sk.data);
      } catch {
        if (m) {
          setNewIn(null);
          setPerfume(null);
          setMakeup(null);
          setSkincare(null);
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
            <View className="mb-6">
              <Text className="text-sm font-roboto-bold text-primary-darkBlue mb-2">New-in ads</Text>
              <View className="flex-row gap-2">
                {[newIn?.ads?.left, newIn?.ads?.right].map(
                  (slot: any, i: number) =>
                    slot?.image?.url ? (
                      <View key={i} className="flex-1 bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                        <Image source={{ uri: slot.image.url }} className="w-full h-28" resizeMode="cover" />
                      </View>
                    ) : null
                )}
                {!newIn?.ads?.left?.image?.url && !newIn?.ads?.right?.image?.url ? (
                  <Text className="text-xs text-primary-grey font-roboto">Not set or empty response.</Text>
                ) : null}
              </View>
            </View>
            <Section title="Perfume promo" data={perfume?.banner || perfume} />
            <Section title="Makeup promo" data={makeup?.banner || makeup} />
            <Section title="Skincare promo" data={skincare?.banner || skincare} />
            <Text className="text-xs text-primary-grey font-roboto leading-5">
              Editing uses the same admin routes as the web app (`PUT` on each `/api/v1/admin/home/...` resource). Image uploads are
              easiest from the desktop admin.
            </Text>
          </ScrollView>
        )}
      </SafeAreaView>
    </AdminGuard>
  );
}

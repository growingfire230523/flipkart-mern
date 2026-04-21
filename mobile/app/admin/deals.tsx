import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminGuard from '../../src/components/admin/AdminGuard';
import { getDealsConfigApi } from '../../src/api/endpoints/banners';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="py-3 border-b border-gray-100">
      <Text className="text-xs text-primary-grey font-roboto uppercase">{label}</Text>
      <Text className="text-sm font-roboto text-primary-darkBlue mt-1">{value}</Text>
    </View>
  );
}

export default function AdminDealsScreen() {
  const [loading, setLoading] = useState(true);
  const [cfg, setCfg] = useState<any>(null);

  useEffect(() => {
    let m = true;
    (async () => {
      try {
        const { data } = await getDealsConfigApi();
        if (m) setCfg(data);
      } catch {
        if (m) setCfg(null);
      } finally {
        if (m) setLoading(false);
      }
    })();
    return () => {
      m = false;
    };
  }, []);

  const fmt = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
  };

  return (
    <AdminGuard>
      <SafeAreaView className="flex-1 bg-cream" edges={['bottom']}>
        {loading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color="#875c43" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            <View className="bg-white rounded-xl px-4 border border-gray-100 shadow-sm">
              <Row label="Flash deal ends" value={fmt(cfg?.endsAt)} />
              <Row label="Deal of the day ends" value={fmt(cfg?.dealOfDayEndsAt)} />
            </View>
            <Text className="text-xs text-primary-grey font-roboto mt-4 leading-5">
              Updating timers and discount rules uses the same admin API as the web app (`PUT /api/v1/admin/deals/config`). Use the
              LEXI web admin for edits; this screen mirrors the public config read used on the storefront.
            </Text>
          </ScrollView>
        )}
      </SafeAreaView>
    </AdminGuard>
  );
}

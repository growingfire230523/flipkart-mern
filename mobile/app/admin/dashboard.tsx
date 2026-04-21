import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminGuard from '../../src/components/admin/AdminGuard';
import { getAdminDashboardStatsApi, getAdminMailingListApi } from '../../src/api/endpoints/admin';
import { getDealsConfigApi } from '../../src/api/endpoints/banners';

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View className="bg-white rounded-xl p-4 mb-3 border border-gray-100 shadow-sm flex-1 min-w-[44%]">
      <Text className="text-xs text-primary-grey font-roboto uppercase tracking-wide">{label}</Text>
      <Text className="text-xl font-roboto-bold text-primary-darkBlue mt-1">{value}</Text>
    </View>
  );
}

export default function AdminDashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [mailCount, setMailCount] = useState(0);
  const [dealNote, setDealNote] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [statsRes, mailRes, dealRes] = await Promise.all([
          getAdminDashboardStatsApi(),
          getAdminMailingListApi(),
          getDealsConfigApi(),
        ]);
        if (!mounted) return;
        setStats(statsRes.data);
        const entries = mailRes.data?.entries;
        setMailCount(Array.isArray(entries) ? entries.length : 0);
        const ends = dealRes.data?.endsAt ? new Date(dealRes.data.endsAt) : null;
        setDealNote(ends && !Number.isNaN(ends.getTime()) ? `Flash deal ends: ${ends.toLocaleString()}` : 'Deal schedule loaded');
      } catch {
        if (mounted) setStats(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const summary = stats?.summary || {};

  return (
    <AdminGuard>
      <SafeAreaView className="flex-1 bg-cream" edges={['bottom']}>
        {loading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color="#875c43" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            <Text className="text-sm text-primary-grey font-roboto mb-4">{dealNote}</Text>
            <View className="flex-row flex-wrap gap-3">
              <StatCard label="Total orders" value={String(summary.totalOrders ?? '—')} />
              <StatCard label="Products" value={String(summary.totalProducts ?? '—')} />
              <StatCard label="Users" value={String(summary.totalUsers ?? '—')} />
              <StatCard label="Mail list" value={String(mailCount)} />
            </View>
            {stats?.charts?.yearlySales && (
              <View className="bg-white rounded-xl p-4 mt-2 border border-gray-100">
                <Text className="text-sm font-roboto-bold text-primary-darkBlue mb-2">Yearly sales (summary)</Text>
                <Text className="text-xs text-primary-grey font-roboto">
                  Open the web admin for full charts. Mobile shows the same summary API as desktop.
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </AdminGuard>
  );
}

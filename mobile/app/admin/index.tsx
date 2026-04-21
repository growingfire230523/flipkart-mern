import React from 'react';
import { Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AdminGuard from '../../src/components/admin/AdminGuard';

type Item = { title: string; subtitle: string; href: '/admin/dashboard' | '/admin/deals' | '/admin/banners' | '/admin/ads' | '/admin/orders' | '/admin/products' | '/admin/new-product' | '/admin/users' | '/admin/mail-list' | '/admin/reviews' };

const MENU: Item[] = [
  { title: 'Dashboard', subtitle: 'Sales & overview', href: '/admin/dashboard' },
  { title: 'Deals', subtitle: 'Timers & deal config', href: '/admin/deals' },
  { title: 'Banners', subtitle: 'Hero & community', href: '/admin/banners' },
  { title: 'Ads & promos', subtitle: 'New-in & category promos', href: '/admin/ads' },
  { title: 'Orders', subtitle: 'All store orders', href: '/admin/orders' },
  { title: 'Products', subtitle: 'Catalog (admin)', href: '/admin/products' },
  { title: 'Add product', subtitle: 'Create on web for uploads', href: '/admin/new-product' },
  { title: 'Users', subtitle: 'Accounts & roles', href: '/admin/users' },
  { title: 'Mail list', subtitle: 'Subscribers', href: '/admin/mail-list' },
  { title: 'Reviews', subtitle: 'By product ID', href: '/admin/reviews' },
];

export default function AdminHomeScreen() {
  const router = useRouter();

  return (
    <AdminGuard>
      <SafeAreaView className="flex-1 bg-cream" edges={['bottom']}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          <Text className="text-xs text-primary-grey font-roboto mb-4">
            Same APIs as the web admin. Complex image uploads are easier on desktop.
          </Text>
          {MENU.map((item) => (
            <Pressable
              key={item.href}
              onPress={() => router.push(item.href)}
              className="bg-white rounded-xl px-4 py-4 mb-3 border border-gray-100 shadow-sm active:opacity-90"
            >
              <Text className="text-base font-roboto-bold text-primary-darkBlue">{item.title}</Text>
              <Text className="text-xs text-primary-grey mt-1 font-roboto">{item.subtitle}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    </AdminGuard>
  );
}

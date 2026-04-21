import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminGuard from '../../src/components/admin/AdminGuard';

export default function AdminNewProductScreen() {
  return (
    <AdminGuard>
      <SafeAreaView className="flex-1 bg-cream" edges={['bottom']}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <Text className="text-base font-roboto-bold text-primary-darkBlue">Add product</Text>
            <Text className="text-sm text-primary-grey font-roboto mt-3 leading-6">
              Creating products requires multiple images, brand logo, and JSON fields. The web admin posts to{' '}
              <Text className="font-roboto-bold text-primary-darkBlue">POST /api/v1/admin/product/new</Text> with the same payload shape
              as the React app.
            </Text>
            <Text className="text-sm text-primary-grey font-roboto mt-4 leading-6">
              Use the LEXI website admin → Add Product for the full form. On mobile you can browse and search the catalog under Admin →
              Products.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </AdminGuard>
  );
}

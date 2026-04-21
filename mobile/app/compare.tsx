import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Image } from 'expo-image';
import { AppDispatch, RootState } from '../src/store';
import { removeFromCompare } from '../src/store/slices/compareSlice';
import { saveCompareItemsToStorage, getActiveUserId } from '../src/utils/cartStorage';
import RatingStars from '../src/components/ui/RatingStars';
import EmptyState from '../src/components/ui/EmptyState';

const FALLBACK_LOCAL_IMAGE = require('../assets/images/bag.png');

function normalizeUri(uri: string): string {
  const u = uri?.trim?.();
  if (!u) return '';
  if (/^(https?:|data:)/i.test(u)) return u;
  if (u.startsWith('//')) return `https:${u}`;
  return '';
}

const SPEC_ROWS = [
  { label: 'Brand', key: 'seller' },
  { label: 'Price', key: 'price', format: (v: any) => v ? `₹${v.toLocaleString()}` : '-' },
  { label: 'Ratings', key: 'ratings', format: (v: any) => v ? `${v}/5` : '-' },
  { label: 'Reviews', key: 'reviews', format: (v: any) => v != null ? String(v) : '-' },
];

export default function CompareScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { compareItems } = useSelector((state: RootState) => state.compare);

  const handleRemove = async (productId: string) => {
    dispatch(removeFromCompare(productId));
    const userId = await getActiveUserId();
    const updated = compareItems.filter(i => i.product !== productId);
    await saveCompareItemsToStorage(userId, updated);
  };

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Text className="text-lg text-primary-grey">←</Text>
        </Pressable>
        <Text className="text-xl font-brand-bold text-primary-darkBlue">Compare Products</Text>
      </View>

      {compareItems.length === 0 ? (
        <EmptyState title="No products to compare" subtitle="Add up to 2 products to compare" />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
          {/* Product images & names */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {compareItems.map((item) => (
              <View key={item.product} className="w-52 bg-white rounded-xl mr-3 overflow-hidden shadow-sm">
                <Pressable onPress={() => router.push(`/product/${item.product}`)}>
                  {(() => {
                    const finalUri = normalizeUri(item.image || '');
                    const finalSource = finalUri ? { uri: finalUri } : FALLBACK_LOCAL_IMAGE;
                    return (
                      <Image
                        source={finalSource}
                        style={{ width: 208, height: 208 }}
                        contentFit="cover"
                        transition={200}
                      />
                    );
                  })()}
                </Pressable>
                <View className="p-3">
                  <Text className="text-sm font-roboto-bold text-primary-darkBlue" numberOfLines={2}>{item.name}</Text>
                  <RatingStars rating={item.ratings} size={12} showCount count={item.reviews} />
                  <Pressable
                    onPress={() => handleRemove(item.product)}
                    className="mt-2 py-1.5 border border-red-200 rounded-lg items-center"
                  >
                    <Text className="text-xs text-red-500 font-roboto-medium">Remove</Text>
                  </Pressable>
                </View>
              </View>
            ))}
            {compareItems.length < 2 && (
              <Pressable
                onPress={() => router.push('/products')}
                className="w-52 bg-white/50 rounded-xl items-center justify-center border-2 border-dashed border-gray-300"
                style={{ minHeight: 300 }}
              >
                <Text className="text-4xl mb-2">+</Text>
                <Text className="text-sm text-primary-grey font-roboto-medium">Add Product</Text>
              </Pressable>
            )}
          </ScrollView>

          {/* Spec comparison table */}
          {compareItems.length === 2 && (
            <View className="mt-4 bg-white rounded-xl overflow-hidden shadow-sm">
              <View className="bg-gray-50 px-3 py-2">
                <Text className="text-sm font-roboto-bold text-primary-darkBlue">Specifications</Text>
              </View>
              {SPEC_ROWS.map((spec) => (
                <View key={spec.label} className="flex-row border-b border-gray-50">
                  <View className="w-24 bg-gray-50 px-3 py-3 justify-center">
                    <Text className="text-xs font-roboto-medium text-gray-600">{spec.label}</Text>
                  </View>
                  {compareItems.map((item) => (
                    <View key={item.product} className="flex-1 px-3 py-3 justify-center">
                      <Text className="text-xs text-gray-800">
                        {spec.format ? spec.format((item as any)[spec.key]) : ((item as any)[spec.key] || '-')}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

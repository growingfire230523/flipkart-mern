import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminGuard from '../../src/components/admin/AdminGuard';
import { getAdminReviewsApi, deleteAdminReviewApi } from '../../src/api/endpoints/admin';
import RatingStars from '../../src/components/ui/RatingStars';

export default function AdminReviewsScreen() {
  const [productId, setProductId] = useState('');
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchReviews = async () => {
    const id = productId.trim();
    if (id.length !== 24) {
      Alert.alert('Product ID', 'Enter a valid 24-character product MongoDB id.');
      return;
    }
    setLoading(true);
    setHasFetched(false);
    try {
      const { data } = await getAdminReviewsApi(id);
      setReviews(Array.isArray(data?.reviews) ? data.reviews : []);
      setHasFetched(true);
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Could not load reviews';
      Alert.alert('Error', String(msg));
      setReviews([]);
      setHasFetched(true);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    if (productId.trim().length !== 24) return;
    setRefreshing(true);
    try {
      const { data } = await getAdminReviewsApi(productId.trim());
      setReviews(Array.isArray(data?.reviews) ? data.reviews : []);
      setHasFetched(true);
    } finally {
      setRefreshing(false);
    }
  };

  const onDelete = (reviewId: string) => {
    const pid = productId.trim();
    Alert.alert('Delete review', 'Remove this review permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAdminReviewApi(reviewId, pid);
            setReviews((prev) => prev.filter((r) => r._id !== reviewId));
          } catch (e: any) {
            Alert.alert('Error', String(e?.response?.data?.message || 'Delete failed'));
          }
        },
      },
    ]);
  };

  return (
    <AdminGuard>
      <SafeAreaView className="flex-1 bg-cream" edges={['bottom']}>
        <View className="px-4 pt-2 pb-3">
          <Text className="text-xs text-primary-grey font-roboto mb-2">
            Same flow as web admin: paste a product id, then load reviews.
          </Text>
          <TextInput
            value={productId}
            onChangeText={setProductId}
            placeholder="Product ID (24 chars)"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-roboto text-gray-800 mb-2"
          />
          <Pressable onPress={fetchReviews} className="bg-primary-blue py-3 rounded-xl items-center">
            <Text className="text-white font-roboto-bold">Load reviews</Text>
          </Pressable>
        </View>
        <FlatList
          data={reviews}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#875c43" />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          ListEmptyComponent={
            hasFetched && !loading && reviews.length === 0 ? (
              <Text className="text-center text-primary-grey font-roboto py-6">No reviews for this product</Text>
            ) : null
          }
          renderItem={({ item }) => (
            <View className="bg-white rounded-xl p-4 mb-3 border border-gray-100 shadow-sm">
              <View className="flex-row justify-between items-center">
                <RatingStars rating={Number(item.rating) || 0} size={16} />
                <Pressable onPress={() => onDelete(item._id)}>
                  <Text className="text-xs text-red-500 font-roboto-bold">Delete</Text>
                </Pressable>
              </View>
              <Text className="text-sm text-primary-darkBlue mt-2 font-roboto" numberOfLines={4}>
                {item.comment || '—'}
              </Text>
              <Text className="text-[10px] text-primary-grey mt-2 font-roboto">{item.user || item.name || 'User'}</Text>
            </View>
          )}
        />
      </SafeAreaView>
    </AdminGuard>
  );
}

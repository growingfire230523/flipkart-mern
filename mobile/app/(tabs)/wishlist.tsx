import React from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Image } from 'expo-image';
import { RootState, AppDispatch } from '../../src/store';
import { removeFromWishlist } from '../../src/store/slices/wishlistSlice';
import { addToCart } from '../../src/store/slices/cartSlice';
import { saveWishlistItemsToStorage, getActiveUserId } from '../../src/utils/cartStorage';
import { getProductDetailsApi } from '../../src/api/endpoints/products';
import EmptyState from '../../src/components/ui/EmptyState';
import { getDiscount } from '../../src/utils/functions';
import Toast from 'react-native-toast-message';

export default function WishlistScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { wishlistItems } = useSelector((state: RootState) => state.wishlist);
  const { isAuthenticated } = useSelector((state: RootState) => state.user);

  const handleRemove = async (productId: string) => {
    dispatch(removeFromWishlist(productId));
    const userId = await getActiveUserId();
    const updated = wishlistItems.filter((i) => i.product !== productId);
    await saveWishlistItemsToStorage(userId, updated);
  };

  const handleMoveToCart = async (item: any) => {
    try {
      const { data } = await getProductDetailsApi(item.product);
      dispatch(addToCart({
        cartItemId: `${data.product._id}:::`,
        product: data.product._id,
        name: data.product.name,
        seller: data.product.brand?.name || '',
        price: data.product.price,
        cuttedPrice: data.product.cuttedPrice,
        image: data.product.images?.[0]?.url,
        stock: data.product.stock,
        quantity: 1,
      }));
      handleRemove(item.product);
      Toast.show({ type: 'success', text1: 'Moved to Cart' });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to move to cart' });
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-cream items-center justify-center" edges={['top']}>
        <Text className="text-lg font-roboto-bold text-gray-800 mb-4">Please login to view wishlist</Text>
        <Pressable onPress={() => router.push('/(auth)/login')} className="bg-primary-blue px-8 py-3 rounded-xl">
          <Text className="text-white font-roboto-bold">Login</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <View className="px-4 pt-4 pb-3">
        <Text className="text-2xl font-brand-bold text-primary-darkBlue">Wishlist</Text>
        <Text className="text-xs text-primary-grey">{wishlistItems.length} items</Text>
      </View>

      <FlatList
        data={wishlistItems}
        numColumns={2}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 100 }}
        columnWrapperStyle={{ gap: 8 }}
        ListEmptyComponent={<EmptyState title="Your wishlist is empty" subtitle="Save items you love here" />}
        keyExtractor={(item) => item.product}
        renderItem={({ item }) => (
          <View className="flex-1 bg-white rounded-xl overflow-hidden shadow-sm mb-2">
            <Pressable onPress={() => router.push(`/product/${item.product}`)}>
              <Image source={{ uri: item.image }} className="w-full h-40" contentFit="cover" transition={200} />
            </Pressable>
            <View className="p-2">
              <Text className="text-sm font-roboto-medium text-gray-800" numberOfLines={2}>{item.name}</Text>
              <View className="flex-row items-center mt-1">
                <Text className="text-sm font-roboto-bold text-primary-darkBlue">₹{item.price?.toLocaleString()}</Text>
                {item.cuttedPrice > item.price && (
                  <Text className="text-xs text-green-600 ml-1">{getDiscount(item.price, item.cuttedPrice)}% off</Text>
                )}
              </View>
              <View className="flex-row mt-2 gap-1">
                <Pressable
                  onPress={() => handleMoveToCart(item)}
                  className="flex-1 bg-primary-blue py-1.5 rounded-lg items-center"
                >
                  <Text className="text-xs text-white font-roboto-medium">Add to Cart</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleRemove(item.product)}
                  className="px-2 py-1.5 rounded-lg border border-gray-200 items-center"
                >
                  <Text className="text-xs text-gray-500">✕</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

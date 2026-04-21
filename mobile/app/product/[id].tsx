import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Dimensions, TextInput, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../src/store';
import { getProductDetails, clearProduct } from '../../src/store/slices/productSlice';
import { getProductsApi } from '../../src/api/endpoints/products';
import { addToCart } from '../../src/store/slices/cartSlice';
import { addToWishlist, removeFromWishlist } from '../../src/store/slices/wishlistSlice';
import { addToCompare } from '../../src/store/slices/compareSlice';
import { submitReview, resetReview } from '../../src/store/slices/reviewSlice';
import { saveCartItemsToStorage, saveWishlistItemsToStorage, saveCompareItemsToStorage, getActiveUserId, addRecentlyViewedItem } from '../../src/utils/cartStorage';
import { Image } from 'expo-image';
import ImageCarousel from '../../src/components/ui/ImageCarousel';
import ProductCard from '../../src/components/ui/ProductCard';
import PriceDisplay from '../../src/components/ui/PriceDisplay';
import RatingStars from '../../src/components/ui/RatingStars';
import QuantityControl from '../../src/components/ui/QuantityControl';
import SkeletonLoader from '../../src/components/ui/SkeletonLoader';
import { getDiscount, getDeliveryDate } from '../../src/utils/functions';
import Toast from 'react-native-toast-message';
import Svg, { Path } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProductDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const { product, productLoading } = useSelector((state: RootState) => state.products);
  const { wishlistItems } = useSelector((state: RootState) => state.wishlist);
  const { cartItems } = useSelector((state: RootState) => state.cart);
  const { compareItems } = useSelector((state: RootState) => state.compare);
  const { isAuthenticated } = useSelector((state: RootState) => state.user);
  const reviewState = useSelector((state: RootState) => state.review);

  const [quantity, setQuantity] = useState(1);
  const [selectedVolume, setSelectedVolume] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<any>(null);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [similarProducts, setSimilarProducts] = useState<any[]>([]);

  const isWishlisted = wishlistItems.some((i) => i.product === id);
  const isInCompare = compareItems.some((i) => i.product === id);

  useEffect(() => {
    if (id) {
      // Clear old product only if it's a different ID, so we don't flash skeleton
      if (product?._id && product._id !== id) dispatch(clearProduct());
      dispatch(getProductDetails(id));
    }
  }, [id, dispatch]);

  useEffect(() => {
    if (product) {
      addRecentlyViewedItem(null, product);
      if (product.volumeVariants?.length) setSelectedVolume(String(product.volumeVariants[0].volume));
      if (product.sizeVariants?.length) setSelectedSize(String(product.sizeVariants[0].size));
      if (product.colorVariants?.length) setSelectedColor(product.colorVariants[0]);
    }
  }, [product]);

  useEffect(() => {
    if (product?.category) {
      (async () => {
        try {
          const { data } = await getProductsApi({ category: product.category });
          const items = (data?.products || []).filter((p: any) => p._id !== id);
          setSimilarProducts(items.slice(0, 12));
        } catch { /* ignore */ }
      })();
    }
  }, [product?.category, id]);

  useEffect(() => {
    if (reviewState.success) {
      Toast.show({ type: 'success', text1: 'Review submitted!' });
      setShowReviewModal(false);
      setReviewComment('');
      setReviewRating(5);
      dispatch(resetReview());
      if (id) dispatch(getProductDetails(id));
    }
    if (reviewState.error) {
      Toast.show({ type: 'error', text1: reviewState.error });
      dispatch(resetReview());
    }
  }, [reviewState.success, reviewState.error]);

  const getEffectiveVariant = () => {
    if (selectedColor) {
      const match = product.colorVariants?.find((v: any) => v.hex === selectedColor.hex);
      if (match) return match;
    }
    if (selectedSize) {
      const match = product.sizeVariants?.find((v: any) => String(v.size) === selectedSize);
      if (match) return match;
    }
    if (selectedVolume) {
      const match = product.volumeVariants?.find((v: any) => String(v.volume) === selectedVolume);
      if (match) return match;
    }
    return null;
  };

  const effectiveVariant = product ? getEffectiveVariant() : null;
  const effectivePrice = effectiveVariant?.price ?? product?.price;
  const effectiveCuttedPrice = effectiveVariant?.cuttedPrice ?? effectiveVariant?.price ?? product?.cuttedPrice;
  const effectiveStock = typeof effectiveVariant?.stock === 'number' ? effectiveVariant.stock : product?.stock;

  const handleAddToCart = async () => {
    const colorHex = selectedColor?.hex ? `#${selectedColor.hex.replace('#', '').toUpperCase()}` : '';
    const cartItemId = `${product._id}:${selectedSize}:${selectedVolume}:${colorHex}`;
    dispatch(addToCart({
      cartItemId,
      product: product._id,
      name: product.name,
      seller: product.brand?.name || '',
      price: effectivePrice,
      cuttedPrice: effectiveCuttedPrice,
      image: product.images?.[0]?.url,
      stock: effectiveStock,
      quantity,
      volume: selectedVolume,
      size: selectedSize,
      colorName: selectedColor?.name || '',
      colorHex,
    }));
    const userId = await getActiveUserId();
    const updatedCart = [...cartItems];
    const existIndex = updatedCart.findIndex(i => i.cartItemId === cartItemId);
    if (existIndex >= 0) updatedCart[existIndex] = { ...updatedCart[existIndex], quantity };
    else updatedCart.push({ cartItemId, product: product._id, name: product.name, seller: product.brand?.name || '', price: effectivePrice, cuttedPrice: effectiveCuttedPrice, image: product.images?.[0]?.url, stock: effectiveStock, quantity, volume: selectedVolume, size: selectedSize, colorName: selectedColor?.name || '', colorHex });
    await saveCartItemsToStorage(userId, updatedCart);
    Toast.show({ type: 'success', text1: 'Added to Cart' });
  };

  const handleWishlist = async () => {
    if (isWishlisted) {
      dispatch(removeFromWishlist(id!));
    } else {
      dispatch(addToWishlist({
        product: product._id,
        name: product.name,
        price: product.price,
        cuttedPrice: product.cuttedPrice,
        image: product.images?.[0]?.url,
        ratings: product.ratings,
        reviews: product.numOfReviews,
      }));
    }
  };

  const handleCompare = async () => {
    if (isInCompare) {
      router.push('/compare');
      return;
    }

    const compareItem = {
      product: product._id,
      name: product.name,
      price: product.price,
      cuttedPrice: product.cuttedPrice,
      image: product.images?.[0]?.url,
      ratings: product.ratings,
      reviews: product.numOfReviews,
      seller: product.brand?.name || '',
    };

    dispatch(addToCompare(compareItem));

    try {
      const userId = await getActiveUserId();
      const next =
        compareItems.length >= 2 ? [...compareItems.slice(1), compareItem] : [...compareItems, compareItem];
      await saveCompareItemsToStorage(userId, next);
    } catch {
      // Non-blocking
    }

    Toast.show({ type: 'success', text1: 'Added to Compare' });
    router.push('/compare');
  };

  const handleSubmitReview = () => {
    if (!reviewComment.trim()) {
      Toast.show({ type: 'error', text1: 'Please write a review' });
      return;
    }
    dispatch(submitReview({ rating: reviewRating, comment: reviewComment, productId: id }));
  };

  if (productLoading || !product) {
    return (
      <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
        <View className="px-4 pt-4">
          {/* Back button placeholder */}
          <View className="flex-row justify-between mb-3">
            <SkeletonLoader width={40} height={40} borderRadius={20} />
            <SkeletonLoader width={40} height={40} borderRadius={20} />
          </View>
          {/* Image placeholder */}
          <SkeletonLoader width="100%" height={SCREEN_WIDTH * 0.85} borderRadius={12} style={{ marginBottom: 16 }} />
          {/* Brand */}
          <SkeletonLoader width={80} height={12} style={{ marginBottom: 8 }} />
          {/* Name */}
          <SkeletonLoader width="85%" height={22} style={{ marginBottom: 8 }} />
          {/* Rating */}
          <SkeletonLoader width={120} height={16} style={{ marginBottom: 12 }} />
          {/* Price */}
          <SkeletonLoader width={140} height={28} style={{ marginBottom: 16 }} />
          {/* Description lines */}
          <SkeletonLoader width="100%" height={14} style={{ marginBottom: 6 }} />
          <SkeletonLoader width="100%" height={14} style={{ marginBottom: 6 }} />
          <SkeletonLoader width="70%" height={14} style={{ marginBottom: 16 }} />
          {/* Delivery card */}
          <SkeletonLoader width="100%" height={60} borderRadius={12} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Back + Wishlist buttons */}
        <View className="flex-row justify-between items-center px-4 py-3">
          <Pressable onPress={() => router.back()} className="w-10 h-10 rounded-full bg-white/80 items-center justify-center">
            <Text className="text-lg">←</Text>
          </Pressable>
          <View className="flex-row items-center gap-2">
            <Pressable onPress={handleWishlist} className="w-10 h-10 rounded-full bg-white/80 items-center justify-center">
              <Svg
                width={22}
                height={22}
                viewBox="0 0 24 24"
                fill={isWishlisted ? '#b76e79' : 'none'}
                stroke={isWishlisted ? '#b76e79' : '#7b6f6a'}
                strokeWidth={1.8}
              >
                <Path
                  d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </Pressable>

            <Pressable onPress={handleCompare} className="w-10 h-10 rounded-full bg-white/80 items-center justify-center">
              <Svg
                width={22}
                height={22}
                viewBox="0 0 24 24"
                fill="none"
                stroke={isInCompare ? '#b76e79' : '#7b6f6a'}
                strokeWidth={1.8}
              >
                <Path d="M10 3H3v7h7V3z" strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M21 3h-7v7h7V3z" strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M21 14h-7v7h7v-7z" strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M10 14H3v7h7v-7z" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Pressable>
          </View>
        </View>

        <ImageCarousel images={product.images || []} height={SCREEN_WIDTH * 0.85} />

        <View className="px-4 mt-4">
          <Text className="text-xs text-primary-grey font-roboto-medium uppercase">{product.brand?.name}</Text>
          <Text className="text-xl font-brand-bold text-primary-darkBlue mt-1">{product.name}</Text>

          <View className="flex-row items-center mt-2">
            <RatingStars rating={product.ratings} size={16} showCount count={product.numOfReviews} />
          </View>

          <View className="mt-3">
            <PriceDisplay price={effectivePrice} cuttedPrice={effectiveCuttedPrice} size="lg" />
          </View>

          {/* Available Offers */}
          <View className="mt-4">
            <Text className="text-sm font-roboto-bold text-primary-darkBlue mb-2">Available Offers</Text>
            {[
              'Bank Offer: 15% instant discount on orders of ₹500 and above',
              'Partner Offer: Get GST invoice and save up to 28% on business purchases',
              'Special Price: Get extra 10% off (price inclusive of cashback)',
            ].map((offer, i) => (
              <View key={i} className="flex-row items-start mb-2">
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="#2f6f4e" stroke="none" style={{ marginTop: 2, marginRight: 8, flexShrink: 0 }}>
                  <Path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
                </Svg>
                <Text className="text-xs text-gray-600 flex-1 leading-4">{offer}</Text>
              </View>
            ))}
          </View>

          {/* Warranty & Brand */}
          <View className="flex-row items-center mt-2 mb-2">
            {product.brand?.logo?.url && (
              <Image source={{ uri: product.brand.logo.url }} style={{ width: 60, height: 24 }} contentFit="contain" className="mr-3" />
            )}
            {product.warranty ? (
              <Text className="text-xs text-primary-grey">{product.warranty} Year Warranty</Text>
            ) : null}
          </View>

          {/* Volume Variants */}
          {product.volumeVariants?.length > 0 && (
            <View className="mt-4">
              <Text className="text-sm font-roboto-medium text-gray-700 mb-2">Volume</Text>
              <View className="flex-row flex-wrap">
                {product.volumeVariants.map((v: any) => (
                  <Pressable
                    key={v.volume}
                    onPress={() => setSelectedVolume(String(v.volume))}
                    className={`px-4 py-2 rounded-lg mr-2 mb-2 border ${
                      selectedVolume === String(v.volume) ? 'border-primary-blue bg-primary-blue/10' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <Text className={`text-sm ${selectedVolume === String(v.volume) ? 'text-primary-blue font-roboto-bold' : 'text-gray-700'}`}>
                      {v.volume}ml
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Size Variants */}
          {product.sizeVariants?.length > 0 && (
            <View className="mt-4">
              <Text className="text-sm font-roboto-medium text-gray-700 mb-2">Size</Text>
              <View className="flex-row flex-wrap">
                {product.sizeVariants.map((v: any) => (
                  <Pressable
                    key={v.size}
                    onPress={() => setSelectedSize(String(v.size))}
                    className={`px-4 py-2 rounded-lg mr-2 mb-2 border ${
                      selectedSize === String(v.size) ? 'border-primary-blue bg-primary-blue/10' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <Text className={`text-sm ${selectedSize === String(v.size) ? 'text-primary-blue font-roboto-bold' : 'text-gray-700'}`}>
                      {v.size}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Color Variants */}
          {product.colorVariants?.length > 0 && (
            <View className="mt-4">
              <Text className="text-sm font-roboto-medium text-gray-700 mb-2">
                Color{selectedColor?.name ? `: ${selectedColor.name}` : ''}
              </Text>
              <View className="flex-row flex-wrap">
                {product.colorVariants.map((v: any) => (
                  <Pressable
                    key={v.hex}
                    onPress={() => setSelectedColor(v)}
                    className={`w-10 h-10 rounded-full mr-2 mb-2 items-center justify-center ${
                      selectedColor?.hex === v.hex ? 'border-2 border-primary-blue' : 'border border-gray-200'
                    }`}
                  >
                    <View className="w-8 h-8 rounded-full" style={{ backgroundColor: `#${v.hex?.replace('#', '')}` }} />
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Delivery + Stock */}
          <View className="mt-4 bg-white rounded-xl p-4">
            <View className="flex-row items-center">
              <Text className="text-sm text-gray-600">Delivery by </Text>
              <Text className="text-sm font-roboto-bold text-gray-800">{getDeliveryDate()}</Text>
            </View>
            <View className="flex-row items-center mt-2">
              <View className={`w-2 h-2 rounded-full mr-2 ${effectiveStock > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
              <Text className={`text-sm ${effectiveStock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                {effectiveStock > 0 ? `In Stock (${effectiveStock} available)` : 'Out of Stock'}
              </Text>
            </View>
          </View>

          {/* Highlights */}
          {product.highlights?.length > 0 && (
            <View className="mt-4">
              <Text className="text-sm font-roboto-medium text-gray-500 mb-2">Highlights</Text>
              {product.highlights.map((h: string, i: number) => (
                <View key={i} className="flex-row items-start mb-1.5">
                  <Text className="text-primary-grey mr-2 text-xs">•</Text>
                  <Text className="text-sm text-gray-700 flex-1">{h}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Seller */}
          <View className="flex-row items-center mt-4">
            <Text className="text-sm text-gray-500 font-roboto-medium mr-4">Seller</Text>
            <Text className="text-sm text-primary-blue font-roboto-medium">{product.brand?.name || 'LEXI'}</Text>
          </View>

          {/* Description */}
          <View className="mt-4">
            <Text className="text-sm font-roboto-medium text-gray-500 mb-2">Description</Text>
            <Text className="text-sm text-gray-600 leading-5" numberOfLines={showFullDesc ? undefined : 4}>
              {product.description}
            </Text>
            <Pressable onPress={() => setShowFullDesc(!showFullDesc)}>
              <Text className="text-sm text-primary-blue mt-1">{showFullDesc ? 'Show Less' : 'Read More'}</Text>
            </Pressable>
          </View>

          {/* Specifications */}
          {product.specifications?.length > 0 && (
            <View className="mt-4 bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <View className="px-4 py-3 border-b border-gray-200">
                <Text className="text-lg font-roboto-bold text-primary-darkBlue">Specifications</Text>
              </View>
              <View className="px-4 py-2">
                <Text className="text-sm font-roboto-medium text-primary-darkBlue mb-2">General</Text>
                {product.specifications.map((spec: any, i: number) => (
                  <View key={i} className="flex-row py-2 border-b border-gray-50">
                    <Text className="text-xs text-gray-500 font-roboto-medium" style={{ width: 110 }}>{spec.title}</Text>
                    <Text className="text-xs text-gray-800 flex-1">{spec.description}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Compare */}
          <Pressable onPress={handleCompare} className="mt-3 flex-row items-center">
            <Text className="text-sm text-primary-blue font-roboto-medium">
              {isInCompare ? 'View Compare' : 'Add to Compare'}
            </Text>
          </Pressable>

          {/* Reviews section */}
          <View className="mt-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-brand-bold text-primary-darkBlue">
                Reviews ({product.numOfReviews || 0})
              </Text>
              {isAuthenticated && (
                <Pressable onPress={() => setShowReviewModal(true)} className="bg-primary-blue/10 px-3 py-1.5 rounded-lg">
                  <Text className="text-xs font-roboto-bold text-primary-blue">Write a Review</Text>
                </Pressable>
              )}
            </View>
            {product.reviews?.slice(0, 5).map((review: any, i: number) => (
              <View key={i} className="bg-white rounded-xl p-3 mb-2">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-roboto-bold text-gray-800">{review.name}</Text>
                  <RatingStars rating={review.rating} size={12} />
                </View>
                <Text className="text-sm text-gray-600 mt-1">{review.comment}</Text>
              </View>
            ))}
          </View>

          {/* Similar Products */}
          {similarProducts.length > 0 && (
            <View className="mt-6">
              <Text className="text-lg font-brand-bold text-primary-darkBlue mb-1">Similar Products</Text>
              <Text className="text-xs text-primary-grey mb-3">Based on the category</Text>
              <FlatList
                data={similarProducts}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <View className="mr-3">
                    <ProductCard product={item} compact />
                  </View>
                )}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky Add to Cart Bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex-row items-center" style={{ paddingBottom: 34 }}>
        <QuantityControl
          quantity={quantity}
          onIncrease={() => setQuantity(Math.min(quantity + 1, effectiveStock || 10))}
          onDecrease={() => setQuantity(Math.max(1, quantity - 1))}
          maxStock={effectiveStock}
        />
        <Pressable
          onPress={handleAddToCart}
          disabled={effectiveStock <= 0}
          className={`flex-1 ml-3 py-3.5 rounded-xl items-center ${effectiveStock <= 0 ? 'bg-primary-grey' : 'bg-primary-blue'}`}
        >
          <Text className="text-white font-roboto-bold text-base">
            {effectiveStock <= 0 ? 'Out of Stock' : 'Add to Cart'}
          </Text>
        </Pressable>
      </View>

      {/* Review Modal */}
      <Modal visible={showReviewModal} transparent animationType="slide">
        <Pressable onPress={() => setShowReviewModal(false)} className="flex-1 bg-black/40 justify-end">
          <Pressable onPress={() => {}} className="bg-white rounded-t-2xl p-4" style={{ paddingBottom: 40 }}>
            <Text className="text-lg font-brand-bold text-primary-darkBlue mb-4">Write a Review</Text>

            <Text className="text-sm font-roboto-medium text-gray-700 mb-2">Rating</Text>
            <View className="flex-row mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={star} onPress={() => setReviewRating(star)} className="mr-2">
                  <Text className={`text-2xl ${star <= reviewRating ? 'text-yellow-400' : 'text-gray-300'}`}>
                    ★
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text className="text-sm font-roboto-medium text-gray-700 mb-2">Your Review</Text>
            <TextInput
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder="Share your experience..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-roboto text-gray-800 min-h-[100px] mb-4"
            />

            <Pressable
              onPress={handleSubmitReview}
              disabled={reviewState.loading}
              className={`py-3.5 rounded-xl items-center ${reviewState.loading ? 'bg-primary-grey' : 'bg-primary-blue'}`}
            >
              <Text className="text-white font-roboto-bold text-base">
                {reviewState.loading ? 'Submitting...' : 'Submit Review'}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

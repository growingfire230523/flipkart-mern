import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Image } from 'expo-image';
import { AppDispatch, RootState } from '../../src/store';
import { removeFromCart, addToCart, emptyCart } from '../../src/store/slices/cartSlice';
import { saveForLater, removeFromSaveForLater } from '../../src/store/slices/saveForLaterSlice';
import {
  saveCartItemsToStorage,
  saveSaveForLaterItemsToStorage,
  getActiveUserId,
} from '../../src/utils/cartStorage';
import QuantityControl from '../../src/components/ui/QuantityControl';
import EmptyState from '../../src/components/ui/EmptyState';
import { getDiscount } from '../../src/utils/functions';
import Toast from 'react-native-toast-message';
import { getProductDetailsApi } from '../../src/api/endpoints/products';

// Local fallback ensures images still show even if remote URLs are missing/unreachable.
// Use a clearly visible asset (avoid potential transparent/white logos).
const FALLBACK_LOCAL_IMAGE = require('../../assets/images/bag.png');

function normalizeUri(uri: string): string {
  const u = uri?.trim?.();
  if (!u) return '';
  // expo-image supports http(s) and data: URIs reliably.
  if (/^(https?:|data:)/i.test(u)) return u;
  if (u.startsWith('//')) return `https:${u}`;
  return '';
}

function resolveImageUri(input: any): string {
  if (!input) return '';
  if (typeof input === 'string') return normalizeUri(input);
  if (typeof input === 'object') {
    if (typeof input.url === 'string' && input.url) return normalizeUri(input.url);
    if (typeof input.secure_url === 'string' && input.secure_url) return normalizeUri(input.secure_url);
    if (typeof input.image?.url === 'string' && input.image.url) return normalizeUri(input.image.url);
  }
  return '';
}

function resolveImageUriFromCartItem(item: any): string {
  if (!item) return '';
  // Most cart entries store `image` as a string URL
  const direct = resolveImageUri(item.image);
  if (direct) return direct;

  // Some flows may store `images` array from product payloads
  if (Array.isArray(item.images) && item.images.length > 0) {
    const first = item.images[0];
    const v = resolveImageUri(first);
    if (v) return v;
    if (typeof first === 'string') return first;
  }

  // Some saved payloads may store nested { url } under `image`
  const nested = resolveImageUri(item.image?.url ? item.image : undefined);
  if (nested) return nested;

  return '';
}

function CartItemCard({ item, onRemove, onQuantityChange, onSaveForLater, imageOverride }: any) {
  const router = useRouter();
  const imgUri = imageOverride || resolveImageUriFromCartItem(item);
  const finalUri = imgUri || '';
  const finalSource = finalUri ? { uri: finalUri } : FALLBACK_LOCAL_IMAGE;
  return (
    <View className="bg-white rounded-xl mx-4 mb-2 p-3 shadow-sm">
      <View className="flex-row">
        <Pressable onPress={() => router.push(`/product/${item.product}`)}>
          <Image
            source={finalSource}
            // Use explicit style to ensure dimensions are applied to expo-image.
            style={{ width: 96, height: 96, borderRadius: 12 }}
            contentFit="cover"
            transition={200}
          />
        </Pressable>
        <View className="flex-1 ml-3">
          <Text className="text-sm font-roboto-medium text-gray-800" numberOfLines={2}>
            {item.name}
          </Text>
          <Text className="text-xs text-primary-grey mt-0.5">{item.seller}</Text>
          {(item.volume || item.size || item.colorName) && (
            <Text className="text-xs text-gray-500 mt-0.5">
              {[item.volume && `${item.volume}ml`, item.size, item.colorName].filter(Boolean).join(' | ')}
            </Text>
          )}
          <View className="flex-row items-center mt-1.5">
            <Text className="text-base font-roboto-bold text-primary-darkBlue">₹{item.price?.toLocaleString()}</Text>
            {item.cuttedPrice > item.price && (
              <>
                <Text className="text-xs text-gray-400 line-through ml-2">₹{item.cuttedPrice?.toLocaleString()}</Text>
                <Text className="text-xs text-green-600 ml-1">{getDiscount(item.price, item.cuttedPrice)}% off</Text>
              </>
            )}
          </View>
        </View>
      </View>
      <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <QuantityControl
          quantity={item.quantity}
          onIncrease={() => onQuantityChange(item, item.quantity + 1)}
          onDecrease={() => onQuantityChange(item, item.quantity - 1)}
          maxStock={item.stock}
        />
        <View className="flex-row gap-3">
          <Pressable onPress={() => onSaveForLater(item)}>
            <Text className="text-xs text-primary-blue font-roboto-medium">Save for Later</Text>
          </Pressable>
          <Pressable onPress={() => onRemove(item.cartItemId)}>
            <Text className="text-xs text-red-500 font-roboto-medium">Remove</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function SaveForLaterCard({ item, onRemove, onMoveToCart, imageOverride }: any) {
  const imgUri = imageOverride || resolveImageUriFromCartItem(item);
  const finalUri = imgUri || '';
  const finalSource = finalUri ? { uri: finalUri } : FALLBACK_LOCAL_IMAGE;
  return (
    <View className="bg-white rounded-xl mx-4 mb-2 p-3 shadow-sm">
      <View className="flex-row">
        <Image
          source={finalSource}
          // Use explicit style to ensure dimensions are applied to expo-image.
          style={{ width: 80, height: 80, borderRadius: 12 }}
          contentFit="cover"
          transition={200}
        />
        <View className="flex-1 ml-3">
          <Text className="text-sm font-roboto-medium text-gray-800" numberOfLines={2}>
            {item.name}
          </Text>
          <Text className="text-base font-roboto-bold text-primary-darkBlue mt-1">₹{item.price?.toLocaleString()}</Text>
        </View>
      </View>
      <View className="flex-row justify-end mt-2 gap-3">
        <Pressable onPress={() => onMoveToCart(item)}>
          <Text className="text-xs text-primary-blue font-roboto-medium">Move to Cart</Text>
        </Pressable>
        <Pressable onPress={() => onRemove(item.cartItemId || item.product)}>
          <Text className="text-xs text-red-500 font-roboto-medium">Remove</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function CartScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { cartItems } = useSelector((state: RootState) => state.cart);
  const { saveForLaterItems } = useSelector((state: RootState) => state.saveForLater);
  const insets = useSafeAreaInsets();

  // Tabs bar is absolute; keep cart footer above it.
  // If you see overlap, increase this value; if footer is too high, decrease it.
  const TAB_BAR_OFFSET = 28;
  const footerBottom = Math.max(0, insets.bottom) + TAB_BAR_OFFSET;
  const scrollPaddingBottom = footerBottom + 28;

  const [productImageById, setProductImageById] = useState<Record<string, string>>({});

  // Root cause: some older AsyncStorage cart entries may be missing `image`.
  // For those products, we fetch details once and fill `productImageById`.
  const missingImageProductIds = useMemo(() => {
    const all = [...cartItems, ...saveForLaterItems];
    const ids = new Set<string>();
    for (const it of all) {
      const pid = it?.product;
      if (!pid) continue;
      const resolved = resolveImageUriFromCartItem(it);
      const already = resolved || productImageById[pid];
      if (!already) ids.add(pid);
    }
    return Array.from(ids);
  }, [cartItems, saveForLaterItems, productImageById]);

  useEffect(() => {
    if (missingImageProductIds.length === 0) return;

    let alive = true;
    (async () => {
      try {
        const toFetch = missingImageProductIds.slice(0, 8);
        const results = await Promise.all(
          toFetch.map(async (pid) => {
            const { data } = await getProductDetailsApi(pid);
            const url =
              data?.product?.images?.[0]?.url ||
              data?.product?.image ||
              data?.product?.images?.[0]?.secure_url ||
              '';
            return { pid, url: typeof url === 'string' ? url : '' };
          })
        );

        if (!alive) return;
        setProductImageById((prev) => {
          const next = { ...prev };
          for (const r of results) {
            if (r.pid && r.url) next[r.pid] = r.url;
          }
          return next;
        });
      } catch {
        // Non-blocking
      }
    })();

    return () => {
      alive = false;
    };
  }, [missingImageProductIds]);

  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalDiscount = cartItems.reduce((sum, item) => {
    const d = (item.cuttedPrice - item.price) * item.quantity;
    return sum + (d > 0 ? d : 0);
  }, 0);

  const handleRemove = async (cartItemId: string) => {
    dispatch(removeFromCart(cartItemId));
    const userId = await getActiveUserId();
    const updated = cartItems.filter((i) => i.cartItemId !== cartItemId && i.product !== cartItemId);
    await saveCartItemsToStorage(userId, updated);
  };

  const handleQuantityChange = async (item: any, newQty: number) => {
    if (newQty < 1) return;
    dispatch(addToCart({ ...item, quantity: newQty }));
    const userId = await getActiveUserId();
    const updated = cartItems.map((i) => (i.cartItemId === item.cartItemId ? { ...i, quantity: newQty } : i));
    await saveCartItemsToStorage(userId, updated);
  };

  const handleSaveForLater = async (item: any) => {
    dispatch(saveForLater(item));
    dispatch(removeFromCart(item.cartItemId));
    const userId = await getActiveUserId();
    const updatedCart = cartItems.filter((i) => i.cartItemId !== item.cartItemId);
    await saveCartItemsToStorage(userId, updatedCart);
    await saveSaveForLaterItemsToStorage(userId, [...saveForLaterItems, item]);
    Toast.show({ type: 'success', text1: 'Saved for later' });
  };

  const handleMoveToCart = async (item: any) => {
    dispatch(addToCart(item));
    dispatch(removeFromSaveForLater(item.cartItemId || item.product));
    const userId = await getActiveUserId();
    await saveCartItemsToStorage(userId, [...cartItems, item]);
    const updatedSfl = saveForLaterItems.filter(
      (i) => (i.cartItemId || i.product) !== (item.cartItemId || item.product)
    );
    await saveSaveForLaterItemsToStorage(userId, updatedSfl);
    Toast.show({ type: 'success', text1: 'Moved to cart' });
  };

  const handleRemoveSfl = async (id: string) => {
    dispatch(removeFromSaveForLater(id));
    const userId = await getActiveUserId();
    const updated = saveForLaterItems.filter((i) => (i.cartItemId || i.product) !== id);
    await saveSaveForLaterItemsToStorage(userId, updated);
  };

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Text className="text-lg text-primary-grey">←</Text>
        </Pressable>
        <Text className="text-xl font-brand-bold text-primary-darkBlue">My Cart ({cartItems.length})</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: scrollPaddingBottom }}>
        {cartItems.length === 0 ? (
          <EmptyState title="Your cart is empty" subtitle="Add items to get started" />
        ) : (
          cartItems.map((item) => (
            <CartItemCard
              key={item.cartItemId || item.product}
              item={item}
              onRemove={handleRemove}
              onQuantityChange={handleQuantityChange}
              onSaveForLater={handleSaveForLater}
              imageOverride={productImageById[item.product]}
            />
          ))
        )}

        {saveForLaterItems.length > 0 && (
          <View className="mt-6">
            <Text className="text-lg font-roboto-bold text-primary-darkBlue px-4 mb-3">
              Saved for Later ({saveForLaterItems.length})
            </Text>
            {saveForLaterItems.map((item) => (
              <SaveForLaterCard
                key={item.cartItemId || item.product}
                item={item}
                onRemove={handleRemoveSfl}
                onMoveToCart={handleMoveToCart}
                imageOverride={productImageById[item.product]}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {cartItems.length > 0 && (
        <View
          className="absolute left-0 right-0 bg-white border-t border-gray-100 px-4 py-3"
          style={{ bottom: footerBottom, zIndex: 50, paddingBottom: 30 }}
        >
          <View className="flex-row justify-between mb-2">
            <Text className="text-sm text-gray-600">Subtotal ({cartItems.length} items)</Text>
            <Text className="text-sm font-roboto-bold text-primary-darkBlue">₹{totalPrice.toLocaleString()}</Text>
          </View>
          {totalDiscount > 0 && (
            <View className="flex-row justify-between mb-2">
              <Text className="text-sm text-green-600">Discount</Text>
              <Text className="text-sm text-green-600">-₹{totalDiscount.toLocaleString()}</Text>
            </View>
          )}
          <Pressable
            onPress={() => router.push('/checkout/shipping')}
            className="bg-primary-orange py-3.5 rounded-xl items-center mt-1"
          >
            <Text className="text-white font-roboto-bold text-base">Place Order</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}


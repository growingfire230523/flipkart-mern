import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeJsonParse } from './storage';

export const ACTIVE_USER_ID_KEY = 'activeUserId';

export const getActiveUserId = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(ACTIVE_USER_ID_KEY);
  } catch {
    return null;
  }
};

export const setActiveUserId = async (userId: string | null): Promise<void> => {
  try {
    if (userId) await AsyncStorage.setItem(ACTIVE_USER_ID_KEY, String(userId));
    else await AsyncStorage.removeItem(ACTIVE_USER_ID_KEY);
  } catch {
    // ignore
  }
};

export const cartItemsStorageKey = (userId: string | null) => `cartItems:${userId || 'guest'}`;
export const shippingInfoStorageKey = (userId: string | null) => `shippingInfo:${userId || 'guest'}`;
export const wishlistItemsStorageKey = (userId: string | null) => `wishlistItems:${userId || 'guest'}`;
export const saveForLaterItemsStorageKey = (userId: string | null) => `saveForLaterItems:${userId || 'guest'}`;
export const compareItemsStorageKey = (userId: string | null) => `compareItems:${userId || 'guest'}`;
export const recentlyViewedItemsStorageKey = (userId: string | null) => `recentlyViewed:${userId || 'guest'}`;

export const normalizeCompareItems = (items: any[]): any[] => {
  if (!Array.isArray(items)) return [];
  const normalized = items
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const rawProduct =
        item.product?.toString?.() ||
        item.product?._id?.toString?.() ||
        item._id?.toString?.() ||
        item.id?.toString?.();
      if (!rawProduct) return null;
      return { ...item, product: rawProduct };
    })
    .filter(Boolean);
  const byId = new Map();
  for (const item of normalized) byId.set(item.product, item);
  const deduped = Array.from(byId.values());
  return deduped.length > 2 ? deduped.slice(deduped.length - 2) : deduped;
};

export const loadCartItemsFromStorage = async (userId: string | null): Promise<any[]> => {
  try {
    const value = await AsyncStorage.getItem(cartItemsStorageKey(userId));
    return safeJsonParse(value, []);
  } catch {
    return [];
  }
};

export const loadShippingInfoFromStorage = async (userId: string | null): Promise<any> => {
  try {
    const value = await AsyncStorage.getItem(shippingInfoStorageKey(userId));
    return safeJsonParse(value, {});
  } catch {
    return {};
  }
};

export const saveCartItemsToStorage = async (userId: string | null, cartItems: any[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(cartItemsStorageKey(userId), JSON.stringify(cartItems || []));
  } catch {
    // ignore
  }
};

export const saveShippingInfoToStorage = async (userId: string | null, shippingInfo: any): Promise<void> => {
  try {
    await AsyncStorage.setItem(shippingInfoStorageKey(userId), JSON.stringify(shippingInfo || {}));
  } catch {
    // ignore
  }
};

export const loadWishlistItemsFromStorage = async (userId: string | null): Promise<any[]> => {
  try {
    const value = await AsyncStorage.getItem(wishlistItemsStorageKey(userId));
    return safeJsonParse(value, []);
  } catch {
    return [];
  }
};

export const saveWishlistItemsToStorage = async (userId: string | null, items: any[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(wishlistItemsStorageKey(userId), JSON.stringify(items || []));
  } catch {
    // ignore
  }
};

export const loadSaveForLaterItemsFromStorage = async (userId: string | null): Promise<any[]> => {
  try {
    const value = await AsyncStorage.getItem(saveForLaterItemsStorageKey(userId));
    return safeJsonParse(value, []);
  } catch {
    return [];
  }
};

export const saveSaveForLaterItemsToStorage = async (userId: string | null, items: any[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(saveForLaterItemsStorageKey(userId), JSON.stringify(items || []));
  } catch {
    // ignore
  }
};

export const loadCompareItemsFromStorage = async (userId: string | null): Promise<any[]> => {
  try {
    const value = await AsyncStorage.getItem(compareItemsStorageKey(userId));
    if (value !== null) return normalizeCompareItems(safeJsonParse(value, []));
    if (userId) {
      const guestValue = await AsyncStorage.getItem(compareItemsStorageKey(null));
      if (guestValue !== null) return normalizeCompareItems(safeJsonParse(guestValue, []));
    }
    return [];
  } catch {
    return [];
  }
};

export const saveCompareItemsToStorage = async (userId: string | null, items: any[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(compareItemsStorageKey(userId), JSON.stringify(normalizeCompareItems(items)));
  } catch {
    // ignore
  }
};

export const loadRecentlyViewedItems = async (userId: string | null): Promise<any[]> => {
  try {
    const raw = await AsyncStorage.getItem(recentlyViewedItemsStorageKey(userId));
    return safeJsonParse(raw, []);
  } catch {
    return [];
  }
};

export const saveRecentlyViewedItemsToStorage = async (userId: string | null, items: any[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(recentlyViewedItemsStorageKey(userId), JSON.stringify(items || []));
  } catch {
    // ignore
  }
};

export const addRecentlyViewedItem = async (userId: string | null, item: any, maxItems = 20): Promise<void> => {
  try {
    if (!item || !item._id) return;
    const existing = await loadRecentlyViewedItems(userId);
    const filtered = Array.isArray(existing) ? existing.filter((p) => p && p._id !== item._id) : [];
    filtered.push(item);
    const clamped = filtered.length > maxItems ? filtered.slice(filtered.length - maxItems) : filtered;
    await saveRecentlyViewedItemsToStorage(userId, clamped);
  } catch {
    // ignore
  }
};

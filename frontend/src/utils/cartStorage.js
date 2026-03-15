export const ACTIVE_USER_ID_KEY = "activeUserId";

export const getActiveUserId = () => {
    try {
        return localStorage.getItem(ACTIVE_USER_ID_KEY);
    } catch {
        return null;
    }
};

export const setActiveUserId = (userId) => {
    try {
        if (userId) localStorage.setItem(ACTIVE_USER_ID_KEY, String(userId));
        else localStorage.removeItem(ACTIVE_USER_ID_KEY);
    } catch {
        // ignore storage errors (private mode, blocked storage, etc.)
    }
};

export const cartItemsStorageKey = (userId) => `cartItems:${userId || "guest"}`;
export const shippingInfoStorageKey = (userId) => `shippingInfo:${userId || "guest"}`;
export const wishlistItemsStorageKey = (userId) => `wishlistItems:${userId || "guest"}`;
export const saveForLaterItemsStorageKey = (userId) => `saveForLaterItems:${userId || "guest"}`;
export const compareItemsStorageKey = (userId) => `compareItems:${userId || "guest"}`;

export const normalizeCompareItems = (items) => {
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

            return {
                ...item,
                product: rawProduct,
            };
        })
        .filter(Boolean);

    // De-dupe by product id, keep the most recent occurrence.
    const byId = new Map();
    for (const item of normalized) byId.set(item.product, item);
    const deduped = Array.from(byId.values());

    // Clamp to max 2 items (keep newest two).
    return deduped.length > 2 ? deduped.slice(deduped.length - 2) : deduped;
};

export const safeJsonParse = (value, fallback) => {
    try {
        return value ? JSON.parse(value) : fallback;
    } catch {
        return fallback;
    }
};

// Recently viewed products ("stalked" items)
export const recentlyViewedItemsStorageKey = (userId) => `recentlyViewed:${userId || "guest"}`;

export const loadRecentlyViewedItems = (userId) => {
    try {
        const raw = localStorage.getItem(recentlyViewedItemsStorageKey(userId));
        return safeJsonParse(raw, []);
    } catch {
        return [];
    }
};

export const saveRecentlyViewedItemsToStorage = (userId, items) => {
    try {
        localStorage.setItem(recentlyViewedItemsStorageKey(userId), JSON.stringify(items || []));
    } catch {
        // ignore storage errors
    }
};

export const addRecentlyViewedItem = (userId, item, maxItems = 20) => {
    try {
        if (!item || !item._id) return;
        const existing = loadRecentlyViewedItems(userId);
        const filtered = Array.isArray(existing)
            ? existing.filter((p) => p && p._id !== item._id)
            : [];

        filtered.push(item);

        const clamped = filtered.length > maxItems
            ? filtered.slice(filtered.length - maxItems)
            : filtered;

        saveRecentlyViewedItemsToStorage(userId, clamped);
    } catch {
        // ignore storage errors
    }
};

export const loadCartItemsFromStorageOrLegacy = (userId) => {
    try {
        const scopedValue = localStorage.getItem(cartItemsStorageKey(userId));
        if (scopedValue !== null) return safeJsonParse(scopedValue, []);

        const legacyValue = localStorage.getItem("cartItems");
        return safeJsonParse(legacyValue, []);
    } catch {
        return [];
    }
};

export const loadShippingInfoFromStorageOrLegacy = (userId) => {
    try {
        const scopedValue = localStorage.getItem(shippingInfoStorageKey(userId));
        if (scopedValue !== null) return safeJsonParse(scopedValue, {});

        const legacyValue = localStorage.getItem("shippingInfo");
        return safeJsonParse(legacyValue, {});
    } catch {
        return {};
    }
};

export const saveCartItemsToStorage = (userId, cartItems) => {
    try {
        localStorage.setItem(cartItemsStorageKey(userId), JSON.stringify(cartItems || []));
    } catch {
        // ignore storage errors
    }
};

export const saveShippingInfoToStorage = (userId, shippingInfo) => {
    try {
        localStorage.setItem(shippingInfoStorageKey(userId), JSON.stringify(shippingInfo || {}));
    } catch {
        // ignore storage errors
    }
};

export const loadWishlistItemsFromStorageOrLegacy = (userId) => {
    try {
        const scopedValue = localStorage.getItem(wishlistItemsStorageKey(userId));
        if (scopedValue !== null) return safeJsonParse(scopedValue, []);

        const legacyValue = localStorage.getItem('wishlistItems');
        return safeJsonParse(legacyValue, []);
    } catch {
        return [];
    }
};

export const saveWishlistItemsToStorage = (userId, wishlistItems) => {
    try {
        localStorage.setItem(wishlistItemsStorageKey(userId), JSON.stringify(wishlistItems || []));
    } catch {
        // ignore storage errors
    }
};

export const loadSaveForLaterItemsFromStorageOrLegacy = (userId) => {
    try {
        const scopedValue = localStorage.getItem(saveForLaterItemsStorageKey(userId));
        if (scopedValue !== null) return safeJsonParse(scopedValue, []);

        const legacyValue = localStorage.getItem('saveForLaterItems');
        return safeJsonParse(legacyValue, []);
    } catch {
        return [];
    }
};

export const loadCompareItemsFromStorage = (userId) => {
    try {
        const scopedValue = localStorage.getItem(compareItemsStorageKey(userId));
        if (scopedValue !== null) return normalizeCompareItems(safeJsonParse(scopedValue, []));

        // Fallback: if user storage missing, allow guest compare as a starting point.
        if (userId) {
            const guestValue = localStorage.getItem(compareItemsStorageKey(null));
            if (guestValue !== null) return normalizeCompareItems(safeJsonParse(guestValue, []));
        }

        return [];
    } catch {
        return [];
    }
};

export const saveCompareItemsToStorage = (userId, compareItems) => {
    try {
        localStorage.setItem(compareItemsStorageKey(userId), JSON.stringify(normalizeCompareItems(compareItems)));
    } catch {
        // ignore storage errors
    }
};

// If the user has no compare list yet, carry over the guest list.
export const mergeGuestCompareIntoUserIfEmpty = (userId) => {
    if (!userId) return;

    try {
        const userKey = compareItemsStorageKey(userId);
        const guestKey = compareItemsStorageKey(null);

        const userExisting = localStorage.getItem(userKey);
        const guestExisting = localStorage.getItem(guestKey);

        const userItems = normalizeCompareItems(safeJsonParse(userExisting, []));
        const guestItems = normalizeCompareItems(safeJsonParse(guestExisting, []));

        if (userItems.length === 0 && guestItems.length > 0) {
            localStorage.setItem(userKey, JSON.stringify(guestItems));
        }
    } catch {
        // ignore storage errors
    }
};

export const saveSaveForLaterItemsToStorage = (userId, saveForLaterItems) => {
    try {
        localStorage.setItem(saveForLaterItemsStorageKey(userId), JSON.stringify(saveForLaterItems || []));
    } catch {
        // ignore storage errors
    }
};

// One-time migration from legacy keys (cartItems/shippingInfo) into user-scoped keys.
export const migrateLegacyCartStorage = (userId) => {
    if (!userId) return;

    try {
        const scopedCartKey = cartItemsStorageKey(userId);
        const scopedShippingKey = shippingInfoStorageKey(userId);

        const hasScopedCart = localStorage.getItem(scopedCartKey) !== null;
        const hasScopedShipping = localStorage.getItem(scopedShippingKey) !== null;

        const legacyCart = localStorage.getItem("cartItems");
        const legacyShipping = localStorage.getItem("shippingInfo");

        if (!hasScopedCart && legacyCart !== null) {
            localStorage.setItem(scopedCartKey, legacyCart);
        }

        if (!hasScopedShipping && legacyShipping !== null) {
            localStorage.setItem(scopedShippingKey, legacyShipping);
        }

        // Keep legacy keys for now (so existing sessions don’t break),
        // but new writes will go to scoped keys.
    } catch {
        // ignore storage errors
    }
};

export const migrateLegacyWishlistStorage = (userId) => {
    if (!userId) return;

    try {
        const scopedKey = wishlistItemsStorageKey(userId);
        const hasScoped = localStorage.getItem(scopedKey) !== null;
        const legacyValue = localStorage.getItem('wishlistItems');

        if (!hasScoped && legacyValue !== null) {
            localStorage.setItem(scopedKey, legacyValue);
        }
    } catch {
        // ignore storage errors
    }
};

export const migrateLegacySaveForLaterStorage = (userId) => {
    if (!userId) return;

    try {
        const scopedKey = saveForLaterItemsStorageKey(userId);
        const hasScoped = localStorage.getItem(scopedKey) !== null;
        const legacyValue = localStorage.getItem('saveForLaterItems');

        if (!hasScoped && legacyValue !== null) {
            localStorage.setItem(scopedKey, legacyValue);
        }
    } catch {
        // ignore storage errors
    }
};

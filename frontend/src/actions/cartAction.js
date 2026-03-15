import axios from "axios"
import { ADD_TO_CART, EMPTY_CART, REMOVE_FROM_CART, SAVE_SHIPPING_INFO } from "../constants/cartConstants";
import { getActiveUserId, saveCartItemsToStorage, saveShippingInfoToStorage } from "../utils/cartStorage";

const normalizeHex = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const v = raw.startsWith('#') ? raw : `#${raw}`;
    const hex = v.toUpperCase();
    if (/^#[0-9A-F]{3}$/.test(hex) || /^#[0-9A-F]{6}$/.test(hex)) return hex;
    return '';
};

const resolveCartOwnerId = (getState) => {
    const state = getState?.();
    return state?.user?.user?._id || getActiveUserId() || null;
};

// add to cart
export const addItemsToCart = (id, quantity = 1, options = {}) => async (dispatch, getState) => {
    const { data } = await axios.get(`/api/v1/product/${id}`);

    const selectedVolume = options?.volume ? String(options.volume) : '';
    const selectedSize = options?.size ? String(options.size) : '';

    const selectedColorHex = normalizeHex(options?.color?.hex ?? options?.colorHex ?? options?.color ?? '');
    const selectedColorName = String(options?.color?.name ?? options?.colorName ?? '').trim();

    const volumeVariants = Array.isArray(data?.product?.volumeVariants) ? data.product.volumeVariants : [];
    const sizeVariants = Array.isArray(data?.product?.sizeVariants) ? data.product.sizeVariants : [];
    const colorVariants = Array.isArray(data?.product?.colorVariants) ? data.product.colorVariants : [];

    const matchedColorVariant = (selectedColorHex || selectedColorName)
        ? colorVariants.find((v) => {
            const hex = normalizeHex(v?.hex);
            const name = String(v?.name || '').trim();
            if (selectedColorHex && hex) return hex === selectedColorHex;
            if (selectedColorName && name) return name.toLowerCase() === selectedColorName.toLowerCase();
            return false;
        })
        : null;

    const matchedSizeVariant = selectedSize
        ? sizeVariants.find((v) => String(v?.size || '') === selectedSize)
        : null;

    const matchedVolumeVariant = selectedVolume
        ? volumeVariants.find((v) => String(v?.volume || '') === selectedVolume)
        : null;

    const effectiveVariant = matchedColorVariant || matchedSizeVariant || matchedVolumeVariant;

    const effectivePrice = effectiveVariant?.price ?? data.product.price;
    const effectiveCuttedPrice = effectiveVariant
        ? (effectiveVariant.cuttedPrice || effectiveVariant.price)
        : data.product.cuttedPrice;
    const effectiveStock = typeof effectiveVariant?.stock === 'number' ? effectiveVariant.stock : data.product.stock;

    const cartItemId = `${data.product._id}:${matchedSizeVariant ? String(matchedSizeVariant.size) : ''}:${matchedVolumeVariant ? String(matchedVolumeVariant.volume) : ''}:${matchedColorVariant ? normalizeHex(matchedColorVariant.hex) : ''}`;

    dispatch({
        type: ADD_TO_CART,
        payload: {
            cartItemId,
            product: data.product._id,
            name: data.product.name,
            seller: data.product.brand.name,
            price: effectivePrice,
            cuttedPrice: effectiveCuttedPrice,
            image: data.product.images[0].url,
            stock: effectiveStock,
            quantity,
            volume: matchedVolumeVariant ? String(matchedVolumeVariant.volume) : '',
            size: matchedSizeVariant ? String(matchedSizeVariant.size) : '',
            colorName: matchedColorVariant ? String(matchedColorVariant.name || '').trim() : '',
            colorHex: matchedColorVariant ? normalizeHex(matchedColorVariant.hex) : '',
        },
    });

    const ownerId = resolveCartOwnerId(getState);
    saveCartItemsToStorage(ownerId, getState().cart.cartItems);
}

// remove cart item
export const removeItemsFromCart = (cartItemId) => async (dispatch, getState) => {

    dispatch({
        type: REMOVE_FROM_CART,
        payload: cartItemId,
    });

    const ownerId = resolveCartOwnerId(getState);
    saveCartItemsToStorage(ownerId, getState().cart.cartItems);
}

// empty cart
export const emptyCart = () => async (dispatch, getState) => {

    dispatch({ type: EMPTY_CART });

    const ownerId = resolveCartOwnerId(getState);
    saveCartItemsToStorage(ownerId, getState().cart.cartItems);
}

// save shipping info
export const saveShippingInfo = (data) => async (dispatch, getState) => {

    dispatch({
        type: SAVE_SHIPPING_INFO,
        payload: data,
    });

    const ownerId = resolveCartOwnerId(getState);
    saveShippingInfoToStorage(ownerId, data);
}
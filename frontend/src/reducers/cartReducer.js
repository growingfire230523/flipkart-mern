import { ADD_TO_CART, EMPTY_CART, REMOVE_FROM_CART, SAVE_SHIPPING_INFO, SET_CART_ITEMS } from "../constants/cartConstants";

const resolveCartItemId = (item) => {
    if (!item) return '';
    if (item.cartItemId) return String(item.cartItemId);
    const productId = item.product?.toString?.() || '';
    const size = item.size ? String(item.size) : '';
    const volume = item.volume ? String(item.volume) : '';
    const colorHex = item.colorHex ? String(item.colorHex) : '';
    return `${productId}:${size}:${volume}:${colorHex}`;
};

export const cartReducer = (state = { cartItems: [], shippingInfo: {} }, { type, payload }) => {
    switch (type) {
        case SET_CART_ITEMS:
            return {
                ...state,
                cartItems: payload || [],
            };
        case ADD_TO_CART:
            const item = payload;
            const itemId = resolveCartItemId(item);
            const isItemExist = state.cartItems.find((el) => resolveCartItemId(el) === itemId);

            if (isItemExist) {
                return {
                    ...state,
                    cartItems: state.cartItems.map((el) =>
                        resolveCartItemId(el) === itemId ? { ...item, cartItemId: itemId } : el
                    ),
                }
            } else {
                return {
                    ...state,
                    cartItems: [...state.cartItems, { ...item, cartItemId: itemId }],
                }
            }
        case REMOVE_FROM_CART:
            // payload can be cartItemId (preferred) or legacy product id
            const removeKey = String(payload);
            return {
                ...state,
                cartItems: state.cartItems.filter((el) => resolveCartItemId(el) !== removeKey && el.product !== removeKey)
            }
        case EMPTY_CART:
            return {
                ...state,
                cartItems: [],
            }
        case SAVE_SHIPPING_INFO:
            return {
                ...state,
                shippingInfo: payload
            }
        default:
            return state;
    }
}
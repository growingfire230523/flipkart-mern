import { CLEAR_SAVE_FOR_LATER, REMOVE_FROM_SAVE_FOR_LATER, SAVE_FOR_LATER, SET_SAVE_FOR_LATER_ITEMS } from "../constants/saveForLaterConstants";

const resolveCartItemId = (item) => {
    if (!item) return '';
    if (item.cartItemId) return String(item.cartItemId);
    const productId = item.product?.toString?.() || '';
    const volume = item.volume ? String(item.volume) : '';
    return `${productId}:${volume}`;
};

export const saveForLaterReducer = (state = { saveForLaterItems: [] }, { type, payload }) => {
    switch (type) {
        case SET_SAVE_FOR_LATER_ITEMS:
            return {
                ...state,
                saveForLaterItems: Array.isArray(payload) ? payload : [],
            };
        case CLEAR_SAVE_FOR_LATER:
            return {
                ...state,
                saveForLaterItems: [],
            };
        case SAVE_FOR_LATER:
            const item = payload;
            if (!item) return state;

            const itemId = resolveCartItemId(item);
            const isItemExist = state.saveForLaterItems.find((i) => resolveCartItemId(i) === itemId);
            if (isItemExist) {
                return {
                    ...state,
                    saveForLaterItems: state.saveForLaterItems.map((i) =>
                        resolveCartItemId(i) === itemId ? { ...item, cartItemId: itemId } : i
                    ),
                }
            } else {
                return {
                    ...state,
                    saveForLaterItems: [...state.saveForLaterItems, { ...item, cartItemId: itemId }]
                }
            }
        case REMOVE_FROM_SAVE_FOR_LATER:
            const removeKey = String(payload);
            return {
                ...state,
                saveForLaterItems: state.saveForLaterItems.filter((i) => resolveCartItemId(i) !== removeKey && i.product !== removeKey),
            }
        default:
            return state;
    }
}
import { ADD_TO_COMPARE, CLEAR_COMPARE, REMOVE_FROM_COMPARE, SET_COMPARE_ITEMS } from "../constants/compareConstants";
import { normalizeCompareItems } from "../utils/cartStorage";

export const compareReducer = (state = { compareItems: [] }, { type, payload }) => {
    switch (type) {
        case SET_COMPARE_ITEMS:
            return {
                ...state,
                compareItems: normalizeCompareItems(payload),
            };
        case CLEAR_COMPARE:
            return {
                ...state,
                compareItems: [],
            };
        case ADD_TO_COMPARE: {
            const item = payload;
            const compareItems = Array.isArray(state.compareItems) ? state.compareItems : [];

            const exists = compareItems.some((i) => i.product === item.product);
            if (exists) return state;

            // Keep at most 2 items. If adding a 3rd, replace the oldest.
            const next = compareItems.length >= 2 ? [...compareItems.slice(1), item] : [...compareItems, item];
            return {
                ...state,
                compareItems: next,
            };
        }
        case REMOVE_FROM_COMPARE:
            return {
                ...state,
                compareItems: (state.compareItems || []).filter((i) => i.product !== payload),
            };
        default:
            return state;
    }
};

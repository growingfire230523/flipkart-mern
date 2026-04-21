import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const resolveCartItemId = (item: any): string => {
  if (!item) return '';
  if (item.cartItemId) return String(item.cartItemId);
  const productId = item.product?.toString?.() || '';
  const volume = item.volume ? String(item.volume) : '';
  return `${productId}:${volume}`;
};

interface SaveForLaterState {
  saveForLaterItems: any[];
}

const initialState: SaveForLaterState = {
  saveForLaterItems: [],
};

const saveForLaterSlice = createSlice({
  name: 'saveForLater',
  initialState,
  reducers: {
    setSaveForLaterItems(state, action: PayloadAction<any[]>) {
      state.saveForLaterItems = Array.isArray(action.payload) ? action.payload : [];
    },
    saveForLater(state, action: PayloadAction<any>) {
      const item = action.payload;
      if (!item) return;
      const itemId = resolveCartItemId(item);
      const existIndex = state.saveForLaterItems.findIndex((i) => resolveCartItemId(i) === itemId);
      if (existIndex >= 0) {
        state.saveForLaterItems[existIndex] = { ...item, cartItemId: itemId };
      } else {
        state.saveForLaterItems.push({ ...item, cartItemId: itemId });
      }
    },
    removeFromSaveForLater(state, action: PayloadAction<string>) {
      const removeKey = String(action.payload);
      state.saveForLaterItems = state.saveForLaterItems.filter(
        (i) => resolveCartItemId(i) !== removeKey && i.product !== removeKey
      );
    },
    clearSaveForLater(state) {
      state.saveForLaterItems = [];
    },
  },
});

export const { setSaveForLaterItems, saveForLater, removeFromSaveForLater, clearSaveForLater } = saveForLaterSlice.actions;
export default saveForLaterSlice.reducer;

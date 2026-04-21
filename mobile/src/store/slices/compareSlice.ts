import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { normalizeCompareItems } from '../../utils/cartStorage';

interface CompareItem {
  product: string;
  name: string;
  price: number;
  cuttedPrice: number;
  image: string;
  ratings: number;
  reviews: number;
  seller: string;
}

interface CompareState {
  compareItems: CompareItem[];
}

const initialState: CompareState = {
  compareItems: [],
};

const compareSlice = createSlice({
  name: 'compare',
  initialState,
  reducers: {
    setCompareItems(state, action: PayloadAction<CompareItem[]>) {
      state.compareItems = normalizeCompareItems(action.payload);
    },
    addToCompare(state, action: PayloadAction<CompareItem>) {
      const item = action.payload;
      const exists = state.compareItems.some((i) => i.product === item.product);
      if (exists) return;
      if (state.compareItems.length >= 2) {
        state.compareItems = [...state.compareItems.slice(1), item];
      } else {
        state.compareItems.push(item);
      }
    },
    removeFromCompare(state, action: PayloadAction<string>) {
      state.compareItems = state.compareItems.filter((i) => i.product !== action.payload);
    },
    clearCompare(state) {
      state.compareItems = [];
    },
  },
});

export const { setCompareItems, addToCompare, removeFromCompare, clearCompare } = compareSlice.actions;
export default compareSlice.reducer;

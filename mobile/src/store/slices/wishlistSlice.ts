import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface WishlistItem {
  product: string;
  name: string;
  price: number;
  cuttedPrice: number;
  image: string;
  ratings: number;
  reviews: number;
}

interface WishlistState {
  wishlistItems: WishlistItem[];
}

const initialState: WishlistState = {
  wishlistItems: [],
};

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    setWishlistItems(state, action: PayloadAction<WishlistItem[]>) {
      state.wishlistItems = Array.isArray(action.payload) ? action.payload : [];
    },
    addToWishlist(state, action: PayloadAction<WishlistItem>) {
      const item = action.payload;
      const exists = state.wishlistItems.find((i) => i.product === item.product);
      if (exists) {
        state.wishlistItems = state.wishlistItems.map((i) =>
          i.product === item.product ? item : i
        );
      } else {
        state.wishlistItems.push(item);
      }
    },
    removeFromWishlist(state, action: PayloadAction<string>) {
      state.wishlistItems = state.wishlistItems.filter((i) => i.product !== action.payload);
    },
    clearWishlist(state) {
      state.wishlistItems = [];
    },
  },
});

export const { setWishlistItems, addToWishlist, removeFromWishlist, clearWishlist } = wishlistSlice.actions;
export default wishlistSlice.reducer;

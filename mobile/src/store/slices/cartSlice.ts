import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CartItem {
  cartItemId: string;
  product: string;
  name: string;
  seller: string;
  price: number;
  cuttedPrice: number;
  image: string;
  stock: number;
  quantity: number;
  volume?: string;
  size?: string;
  colorName?: string;
  colorHex?: string;
}

interface CartState {
  cartItems: CartItem[];
  shippingInfo: any;
}

const resolveCartItemId = (item: any): string => {
  if (!item) return '';
  if (item.cartItemId) return String(item.cartItemId);
  const productId = item.product?.toString?.() || '';
  const size = item.size ? String(item.size) : '';
  const volume = item.volume ? String(item.volume) : '';
  const colorHex = item.colorHex ? String(item.colorHex) : '';
  return `${productId}:${size}:${volume}:${colorHex}`;
};

const initialState: CartState = {
  cartItems: [],
  shippingInfo: {},
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setCartItems(state, action: PayloadAction<CartItem[]>) {
      state.cartItems = action.payload || [];
    },
    addToCart(state, action: PayloadAction<CartItem>) {
      const item = action.payload;
      const itemId = resolveCartItemId(item);
      const existIndex = state.cartItems.findIndex((el) => resolveCartItemId(el) === itemId);
      if (existIndex >= 0) {
        state.cartItems[existIndex] = { ...item, cartItemId: itemId };
      } else {
        state.cartItems.push({ ...item, cartItemId: itemId });
      }
    },
    removeFromCart(state, action: PayloadAction<string>) {
      const removeKey = String(action.payload);
      state.cartItems = state.cartItems.filter(
        (el) => resolveCartItemId(el) !== removeKey && el.product !== removeKey
      );
    },
    emptyCart(state) {
      state.cartItems = [];
    },
    setShippingInfo(state, action: PayloadAction<any>) {
      state.shippingInfo = action.payload;
    },
  },
});

export const { setCartItems, addToCart, removeFromCart, emptyCart, setShippingInfo } = cartSlice.actions;
export default cartSlice.reducer;

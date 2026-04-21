import { configureStore } from '@reduxjs/toolkit';
import userReducer from './slices/userSlice';
import productReducer from './slices/productSlice';
import cartReducer from './slices/cartSlice';
import wishlistReducer from './slices/wishlistSlice';
import compareReducer from './slices/compareSlice';
import saveForLaterReducer from './slices/saveForLaterSlice';
import orderReducer from './slices/orderSlice';
import reviewReducer from './slices/reviewSlice';
import homeReducer from './slices/homeSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    products: productReducer,
    cart: cartReducer,
    wishlist: wishlistReducer,
    compare: compareReducer,
    saveForLater: saveForLaterReducer,
    order: orderReducer,
    review: reviewReducer,
    home: homeReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

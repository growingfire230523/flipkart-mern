import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';
import { loginApi, registerApi, loadUserApi, logoutApi, updateProfileApi, updatePasswordApi, forgotPasswordApi, resetPasswordApi, googleLoginApi, phoneLoginVerifyApi } from '../../api/endpoints/auth';
import { setActiveUserId, loadCartItemsFromStorage, loadShippingInfoFromStorage, loadWishlistItemsFromStorage, loadSaveForLaterItemsFromStorage, loadCompareItemsFromStorage } from '../../utils/cartStorage';
import { setCartItems, setShippingInfo } from './cartSlice';
import { setWishlistItems } from './wishlistSlice';
import { setSaveForLaterItems } from './saveForLaterSlice';
import { setCompareItems } from './compareSlice';

interface UserState {
  user: any;
  loading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  message: string | null;
  isUpdated: boolean;
}

const initialState: UserState = {
  user: null,
  loading: false,
  isAuthenticated: false,
  error: null,
  message: null,
  isUpdated: false,
};

const loadUserStorage = async (userId: string, dispatch: any) => {
  await setActiveUserId(userId);
  const [cart, shipping, wishlist, saveForLater, compare] = await Promise.all([
    loadCartItemsFromStorage(userId),
    loadShippingInfoFromStorage(userId),
    loadWishlistItemsFromStorage(userId),
    loadSaveForLaterItemsFromStorage(userId),
    loadCompareItemsFromStorage(userId),
  ]);
  dispatch(setCartItems(cart));
  dispatch(setShippingInfo(shipping));
  dispatch(setWishlistItems(wishlist));
  dispatch(setSaveForLaterItems(saveForLater));
  dispatch(setCompareItems(compare));
};

export const loginUser = createAsyncThunk(
  'user/login',
  async ({ email, password }: { email: string; password: string }, { dispatch, rejectWithValue }) => {
    try {
      const { data } = await loginApi(email, password);
      if (data.token) {
        await SecureStore.setItemAsync('authToken', data.token);
      }
      const userId = data?.user?._id;
      if (userId) await loadUserStorage(userId, dispatch);
      return data.user;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

export const registerUser = createAsyncThunk(
  'user/register',
  async (userData: FormData, { dispatch, rejectWithValue }) => {
    try {
      const { data } = await registerApi(userData);
      if (data.token) {
        await SecureStore.setItemAsync('authToken', data.token);
      }
      const userId = data?.user?._id;
      if (userId) await loadUserStorage(userId, dispatch);
      return data.user;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Registration failed');
    }
  }
);

export const loadUser = createAsyncThunk(
  'user/load',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const { data } = await loadUserApi();
      const userId = data?.user?._id;
      if (userId) await loadUserStorage(userId, dispatch);
      return data.user;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load user');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'user/logout',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      await logoutApi();
      await SecureStore.deleteItemAsync('authToken');
      await setActiveUserId(null);
      const [cart, shipping, wishlist, saveForLater, compare] = await Promise.all([
        loadCartItemsFromStorage(null),
        loadShippingInfoFromStorage(null),
        loadWishlistItemsFromStorage(null),
        loadSaveForLaterItemsFromStorage(null),
        loadCompareItemsFromStorage(null),
      ]);
      dispatch(setCartItems(cart));
      dispatch(setShippingInfo(shipping));
      dispatch(setWishlistItems(wishlist));
      dispatch(setSaveForLaterItems(saveForLater));
      dispatch(setCompareItems(compare));
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Logout failed');
    }
  }
);

export const updateProfile = createAsyncThunk(
  'user/updateProfile',
  async (userData: FormData, { rejectWithValue }) => {
    try {
      const { data } = await updateProfileApi(userData);
      return data.success;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Update failed');
    }
  }
);

export const updatePassword = createAsyncThunk(
  'user/updatePassword',
  async (passwords: { oldPassword: string; newPassword: string; confirmPassword: string }, { rejectWithValue }) => {
    try {
      const { data } = await updatePasswordApi(passwords);
      return data.success;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Password update failed');
    }
  }
);

export const forgotPassword = createAsyncThunk(
  'user/forgotPassword',
  async (email: string, { rejectWithValue }) => {
    try {
      const { data } = await forgotPasswordApi(email);
      return data.message;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Request failed');
    }
  }
);

export const resetPassword = createAsyncThunk(
  'user/resetPassword',
  async ({ token, passwords }: { token: string; passwords: { password: string; confirmPassword: string } }, { rejectWithValue }) => {
    try {
      const { data } = await resetPasswordApi(token, passwords);
      return data.success;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Reset failed');
    }
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearErrors(state) {
      state.error = null;
    },
    clearMessage(state) {
      state.message = null;
    },
    resetUpdate(state) {
      state.isUpdated = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false; state.isAuthenticated = true; state.user = action.payload;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false; state.error = action.payload as string;
      })
      // Register
      .addCase(registerUser.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false; state.isAuthenticated = true; state.user = action.payload;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false; state.error = action.payload as string;
      })
      // Load User
      .addCase(loadUser.pending, (state) => { state.loading = true; })
      .addCase(loadUser.fulfilled, (state, action) => {
        state.loading = false; state.isAuthenticated = true; state.user = action.payload;
      })
      .addCase(loadUser.rejected, (state) => {
        state.loading = false; state.isAuthenticated = false; state.user = null;
      })
      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.isAuthenticated = false; state.user = null; state.loading = false;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Update Profile
      .addCase(updateProfile.pending, (state) => { state.loading = true; })
      .addCase(updateProfile.fulfilled, (state) => {
        state.loading = false; state.isUpdated = true;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false; state.error = action.payload as string;
      })
      // Update Password
      .addCase(updatePassword.pending, (state) => { state.loading = true; })
      .addCase(updatePassword.fulfilled, (state) => {
        state.loading = false; state.isUpdated = true;
      })
      .addCase(updatePassword.rejected, (state, action) => {
        state.loading = false; state.error = action.payload as string;
      })
      // Forgot Password
      .addCase(forgotPassword.pending, (state) => { state.loading = true; })
      .addCase(forgotPassword.fulfilled, (state, action) => {
        state.loading = false; state.message = action.payload as string;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.loading = false; state.error = action.payload as string;
      })
      // Reset Password
      .addCase(resetPassword.pending, (state) => { state.loading = true; })
      .addCase(resetPassword.fulfilled, (state) => {
        state.loading = false; state.isUpdated = true;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false; state.error = action.payload as string;
      });
  },
});

export const { clearErrors, clearMessage, resetUpdate } = userSlice.actions;
export default userSlice.reducer;

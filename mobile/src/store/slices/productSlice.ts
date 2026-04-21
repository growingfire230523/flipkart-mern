import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getProductsApi, getProductDetailsApi, getSliderProductsApi, getTopRatedApi, getNewInApi, getBestSellersApi } from '../../api/endpoints/products';

interface ProductState {
  products: any[];
  product: any;
  productsCount: number;
  resultPerPage: number;
  filteredProductsCount: number;
  loading: boolean;
  productLoading: boolean;
  error: string | null;
  sliderProducts: any[];
  topRated: any[];
  newIn: any[];
  bestSellers: any[];
}

const initialState: ProductState = {
  products: [],
  product: null,
  productsCount: 0,
  resultPerPage: 0,
  filteredProductsCount: 0,
  loading: false,
  productLoading: false,
  error: null,
  sliderProducts: [],
  topRated: [],
  newIn: [],
  bestSellers: [],
};

export const getProducts = createAsyncThunk(
  'products/getAll',
  async (params: Record<string, string>, { rejectWithValue }) => {
    try {
      const { data } = await getProductsApi(params);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch products');
    }
  }
);

export const getProductDetails = createAsyncThunk(
  'products/getDetails',
  async (id: string, { rejectWithValue }) => {
    try {
      const { data } = await getProductDetailsApi(id);
      return data.product;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch product');
    }
  }
);

export const getSliderProducts = createAsyncThunk(
  'products/getSlider',
  async (_, { rejectWithValue }) => {
    try {
      console.log('[SliderProducts] Fetching /api/v1/products/all?limit=48');
      const { data } = await getSliderProductsApi();
      console.log('[SliderProducts] Response: products=', data?.products?.length, 'first image=', data?.products?.[0]?.images?.[0]?.url?.slice(0, 60));
      return data.products;
    } catch (error: any) {
      console.warn('[SliderProducts] FAILED:', error?.message, error?.response?.status);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch slider products');
    }
  }
);

export const getTopRatedProducts = createAsyncThunk(
  'products/getTopRated',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await getTopRatedApi();
      return data.products;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch');
    }
  }
);

export const getNewInProducts = createAsyncThunk(
  'products/getNewIn',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await getNewInApi();
      return data.products;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch');
    }
  }
);

export const getBestSellerProducts = createAsyncThunk(
  'products/getBestSellers',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await getBestSellersApi();
      return data.products;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch');
    }
  }
);

const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    clearErrors(state) { state.error = null; },
    clearProduct(state) { state.product = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getProducts.pending, (state) => { state.loading = true; })
      .addCase(getProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload.products;
        state.productsCount = action.payload.productsCount;
        state.resultPerPage = action.payload.resultPerPage;
        state.filteredProductsCount = action.payload.filteredProductsCount;
      })
      .addCase(getProducts.rejected, (state, action) => {
        state.loading = false; state.error = action.payload as string;
      })
      .addCase(getProductDetails.pending, (state) => { state.productLoading = true; })
      .addCase(getProductDetails.fulfilled, (state, action) => {
        state.productLoading = false; state.product = action.payload;
      })
      .addCase(getProductDetails.rejected, (state, action) => {
        state.productLoading = false; state.error = action.payload as string;
      })
      .addCase(getSliderProducts.pending, (state) => { state.loading = true; })
      .addCase(getSliderProducts.fulfilled, (state, action) => {
        state.loading = false; state.sliderProducts = action.payload;
      })
      .addCase(getSliderProducts.rejected, (state, action) => {
        state.loading = false; state.error = action.payload as string;
      })
      .addCase(getTopRatedProducts.fulfilled, (state, action) => {
        state.topRated = action.payload;
      })
      .addCase(getNewInProducts.fulfilled, (state, action) => {
        state.newIn = action.payload;
      })
      .addCase(getBestSellerProducts.fulfilled, (state, action) => {
        state.bestSellers = action.payload;
      });
  },
});

export const { clearErrors, clearProduct } = productSlice.actions;
export default productSlice.reducer;

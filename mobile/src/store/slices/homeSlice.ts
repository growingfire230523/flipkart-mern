import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getHeroBannersApi, getDealsApi, getMakeupPromoBannerApi, getPerfumePromoBannerApi, getSkincarePromoBannerApi, getDealsConfigApi, getNewInAdsApi, getCommunityBannerApi } from '../../api/endpoints/banners';
import { getTopRatedApi, getNewInApi, getBestSellersApi } from '../../api/endpoints/products';

interface HomeState {
  heroBanners: any[];
  flashDealProducts: any[];
  dealConfig: any;
  topRatedProducts: any[];
  bestSellerProducts: any[];
  newInProducts: any[];
  newInAds: any;
  communityBanner: any;
  promoBanners: { makeup: any; perfume: any; skincare: any };
  loading: boolean;
  error: string | null;
}

const initialState: HomeState = {
  heroBanners: [],
  flashDealProducts: [],
  dealConfig: null,
  topRatedProducts: [],
  bestSellerProducts: [],
  newInProducts: [],
  newInAds: null,
  communityBanner: null,
  promoBanners: { makeup: null, perfume: null, skincare: null },
  loading: false,
  error: null,
};

export const fetchHeroBanners = createAsyncThunk('home/fetchHeroBanners', async (_, { rejectWithValue }) => {
  try {
    const { data } = await getHeroBannersApi();
    return data.banners || data;
  } catch (e: any) {
    return rejectWithValue(e.response?.data?.message || 'Failed to fetch banners');
  }
});

export const fetchFlashDeals = createAsyncThunk('home/fetchFlashDeals', async (_, { rejectWithValue }) => {
  try {
    const { data } = await getDealsApi(12);
    return data;
  } catch (e: any) {
    return rejectWithValue(e.response?.data?.message || 'Failed to fetch deals');
  }
});

export const fetchDealConfig = createAsyncThunk('home/fetchDealConfig', async (_, { rejectWithValue }) => {
  try {
    const { data } = await getDealsConfigApi();
    return data;
  } catch (e: any) {
    return rejectWithValue(e.response?.data?.message || 'Failed to fetch deal config');
  }
});

export const fetchTopRated = createAsyncThunk('home/fetchTopRated', async (_, { rejectWithValue }) => {
  try {
    const { data } = await getTopRatedApi();
    return data.products || [];
  } catch (e: any) {
    return rejectWithValue(e.response?.data?.message || 'Failed to fetch top rated');
  }
});

export const fetchBestSellers = createAsyncThunk('home/fetchBestSellers', async (_, { rejectWithValue }) => {
  try {
    const { data } = await getBestSellersApi();
    return data.products || [];
  } catch (e: any) {
    return rejectWithValue(e.response?.data?.message || 'Failed to fetch best sellers');
  }
});

export const fetchNewIn = createAsyncThunk('home/fetchNewIn', async (_, { rejectWithValue }) => {
  try {
    const { data } = await getNewInApi();
    return data.products || [];
  } catch (e: any) {
    return rejectWithValue(e.response?.data?.message || 'Failed to fetch new in');
  }
});

export const fetchNewInAds = createAsyncThunk('home/fetchNewInAds', async (_, { rejectWithValue }) => {
  try {
    const { data } = await getNewInAdsApi();
    return data;
  } catch (e: any) {
    return rejectWithValue(e.response?.data?.message || 'Failed to fetch new in ads');
  }
});

export const fetchCommunityBanner = createAsyncThunk('home/fetchCommunityBanner', async (_, { rejectWithValue }) => {
  try {
    const { data } = await getCommunityBannerApi();
    return data.banner || data;
  } catch (e: any) {
    return rejectWithValue(e.response?.data?.message || 'Failed to fetch community banner');
  }
});

export const fetchPromoBanners = createAsyncThunk('home/fetchPromoBanners', async (_, { rejectWithValue }) => {
  try {
    const [makeup, perfume, skincare] = await Promise.allSettled([
      getMakeupPromoBannerApi(),
      getPerfumePromoBannerApi(),
      getSkincarePromoBannerApi(),
    ]);
    return {
      makeup: makeup.status === 'fulfilled' ? (makeup.value.data.banner || makeup.value.data) : null,
      perfume: perfume.status === 'fulfilled' ? (perfume.value.data.banner || perfume.value.data) : null,
      skincare: skincare.status === 'fulfilled' ? (skincare.value.data.banner || skincare.value.data) : null,
    };
  } catch (e: any) {
    return rejectWithValue('Failed to fetch promo banners');
  }
});

const homeSlice = createSlice({
  name: 'home',
  initialState,
  reducers: {
    clearHomeErrors(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHeroBanners.fulfilled, (state, action) => { state.heroBanners = action.payload; })
      .addCase(fetchFlashDeals.fulfilled, (state, action) => {
        state.flashDealProducts = action.payload.products || [];
        if (action.payload.endsAt) state.dealConfig = { ...state.dealConfig, endsAt: action.payload.endsAt };
        if (action.payload.dealOfDayEndsAt) state.dealConfig = { ...state.dealConfig, dealOfDayEndsAt: action.payload.dealOfDayEndsAt, heroImageUrl: action.payload.heroImageUrl, heroLink: action.payload.heroLink };
      })
      .addCase(fetchDealConfig.fulfilled, (state, action) => { state.dealConfig = { ...state.dealConfig, ...action.payload }; })
      .addCase(fetchTopRated.fulfilled, (state, action) => { state.topRatedProducts = action.payload; })
      .addCase(fetchBestSellers.fulfilled, (state, action) => { state.bestSellerProducts = action.payload; })
      .addCase(fetchNewIn.fulfilled, (state, action) => { state.newInProducts = action.payload; })
      .addCase(fetchNewInAds.fulfilled, (state, action) => { state.newInAds = action.payload; })
      .addCase(fetchCommunityBanner.fulfilled, (state, action) => { state.communityBanner = action.payload; })
      .addCase(fetchPromoBanners.fulfilled, (state, action) => { state.promoBanners = action.payload; });
  },
});

export const { clearHomeErrors } = homeSlice.actions;
export default homeSlice.reducer;

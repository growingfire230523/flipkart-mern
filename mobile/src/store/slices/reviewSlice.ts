import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { newReviewApi } from '../../api/endpoints/products';

interface ReviewState {
  loading: boolean;
  success: boolean;
  error: string | null;
}

const initialState: ReviewState = {
  loading: false,
  success: false,
  error: null,
};

export const submitReview = createAsyncThunk(
  'review/submit',
  async (reviewData: any, { rejectWithValue }) => {
    try {
      const { data } = await newReviewApi(reviewData);
      return data.success;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Review submission failed');
    }
  }
);

const reviewSlice = createSlice({
  name: 'review',
  initialState,
  reducers: {
    resetReview(state) { state.success = false; state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitReview.pending, (state) => { state.loading = true; })
      .addCase(submitReview.fulfilled, (state) => {
        state.loading = false; state.success = true;
      })
      .addCase(submitReview.rejected, (state, action) => {
        state.loading = false; state.error = action.payload as string;
      });
  },
});

export const { resetReview } = reviewSlice.actions;
export default reviewSlice.reducer;

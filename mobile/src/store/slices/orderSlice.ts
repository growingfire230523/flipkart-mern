import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { newOrderApi, myOrdersApi, getOrderDetailsApi, getPaymentStatusApi } from '../../api/endpoints/orders';

interface OrderState {
  order: any;
  orders: any[];
  orderDetail: any;
  loading: boolean;
  error: string | null;
  paymentStatus: any;
}

const initialState: OrderState = {
  order: null,
  orders: [],
  orderDetail: null,
  loading: false,
  error: null,
  paymentStatus: null,
};

export const createOrder = createAsyncThunk(
  'order/create',
  async (orderData: any, { rejectWithValue }) => {
    try {
      const { data } = await newOrderApi(orderData);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Order creation failed');
    }
  }
);

export const fetchMyOrders = createAsyncThunk(
  'order/myOrders',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await myOrdersApi();
      return data.orders;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch orders');
    }
  }
);

export const fetchOrderDetails = createAsyncThunk(
  'order/details',
  async (id: string, { rejectWithValue }) => {
    try {
      const { data } = await getOrderDetailsApi(id);
      return data.order;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch order');
    }
  }
);

export const fetchPaymentStatus = createAsyncThunk(
  'order/paymentStatus',
  async (id: string, { rejectWithValue }) => {
    try {
      const { data } = await getPaymentStatusApi(id);
      return data.txn;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch payment status');
    }
  }
);

const orderSlice = createSlice({
  name: 'order',
  initialState,
  reducers: {
    clearErrors(state) { state.error = null; },
    clearOrder(state) { state.order = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createOrder.pending, (state) => { state.loading = true; })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.loading = false; state.order = action.payload;
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.loading = false; state.error = action.payload as string;
      })
      .addCase(fetchMyOrders.pending, (state) => { state.loading = true; })
      .addCase(fetchMyOrders.fulfilled, (state, action) => {
        state.loading = false; state.orders = action.payload;
      })
      .addCase(fetchMyOrders.rejected, (state, action) => {
        state.loading = false; state.error = action.payload as string;
      })
      .addCase(fetchOrderDetails.pending, (state) => { state.loading = true; })
      .addCase(fetchOrderDetails.fulfilled, (state, action) => {
        state.loading = false; state.orderDetail = action.payload;
      })
      .addCase(fetchOrderDetails.rejected, (state, action) => {
        state.loading = false; state.error = action.payload as string;
      })
      .addCase(fetchPaymentStatus.fulfilled, (state, action) => {
        state.paymentStatus = action.payload;
      });
  },
});

export const { clearErrors, clearOrder } = orderSlice.actions;
export default orderSlice.reducer;

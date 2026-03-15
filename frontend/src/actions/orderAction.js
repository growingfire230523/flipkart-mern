import axios from "axios";
import { ALL_ORDERS_FAIL, ALL_ORDERS_REQUEST, ALL_ORDERS_SUCCESS, CLEAR_ERRORS, DELETE_ORDER_FAIL, DELETE_ORDER_REQUEST, DELETE_ORDER_SUCCESS, MY_ORDERS_FAIL, MY_ORDERS_REQUEST, MY_ORDERS_SUCCESS, NEW_ORDER_FAIL, NEW_ORDER_REQUEST, NEW_ORDER_SUCCESS, ORDER_DETAILS_FAIL, ORDER_DETAILS_REQUEST, ORDER_DETAILS_SUCCESS, PAYMENT_STATUS_FAIL, PAYMENT_STATUS_REQUEST, PAYMENT_STATUS_SUCCESS, UPDATE_ORDER_FAIL, UPDATE_ORDER_REQUEST, UPDATE_ORDER_SUCCESS } from "../constants/orderConstants";

// New Order
export const newOrder = (order) => async (dispatch) => {
    try {
        dispatch({ type: NEW_ORDER_REQUEST });

        const config = {
            headers: {
                "Content-Type": "application/json",
            },
        };

        const { data } = await axios.post('/api/v1/order/new', order, config);

        dispatch({
            type: NEW_ORDER_SUCCESS,
            payload: data,
        })

    } catch (error) {
        dispatch({
            type: NEW_ORDER_FAIL,
            payload: error.response.data.message,
        });
    }
};

// Get User Orders
export const myOrders = () => async (dispatch) => {
    try {
        dispatch({ type: MY_ORDERS_REQUEST });

        const { data } = await axios.get('/api/v1/orders/me');

        dispatch({
            type: MY_ORDERS_SUCCESS,
            payload: data.orders,
        })

    } catch (error) {
        dispatch({
            type: MY_ORDERS_FAIL,
            payload: error.response.data.message,
        });
    }
};

// Get Order Details
export const getOrderDetails = (id) => async (dispatch) => {
    try {
        dispatch({ type: ORDER_DETAILS_REQUEST });

        const { data } = await axios.get(`/api/v1/order/${id}`);

        dispatch({
            type: ORDER_DETAILS_SUCCESS,
            payload: data.order,
        })

    } catch (error) {
        dispatch({
            type: ORDER_DETAILS_FAIL,
            payload: error.response.data.message,
        });
    }
};

// Get Payment Status
export const getPaymentStatus = (id) => async (dispatch) => {
    try {
        dispatch({ type: PAYMENT_STATUS_REQUEST });

        const { data } = await axios.get(`/api/v1/payment/status/${id}`);

        dispatch({
            type: PAYMENT_STATUS_SUCCESS,
            payload: data.txn,
        })

    } catch (error) {
        dispatch({
            type: PAYMENT_STATUS_FAIL,
            payload: error.response.data.message,
        });
    }
};

// Get All Orders ---ADMIN
export const getAllOrders = () => async (dispatch) => {
    try {
        dispatch({ type: ALL_ORDERS_REQUEST });

        const { data } = await axios.get('/api/v1/admin/orders');

        dispatch({
            type: ALL_ORDERS_SUCCESS,
            payload: data.orders,
        })

    } catch (error) {
        dispatch({
            type: ALL_ORDERS_FAIL,
            payload: error.response.data.message,
        });
    }
};

// Update Order ---ADMIN
export const updateOrder = (id, order) => async (dispatch) => {
    try {
        dispatch({ type: UPDATE_ORDER_REQUEST });

        const config = {
            headers: {
                "Content-Type": "application/json",
            },
        };

        const { data } = await axios.put(`/api/v1/admin/order/${id}`, order, config);

        dispatch({
            type: UPDATE_ORDER_SUCCESS,
            payload: data.success,
        });

    } catch (error) {
        dispatch({
            type: UPDATE_ORDER_FAIL,
            payload: error.response.data.message,
        });
    }
};

// Delete Order ---ADMIN
export const deleteOrder = (id) => async (dispatch) => {
    try {
        dispatch({ type: DELETE_ORDER_REQUEST });

        const { data } = await axios.delete(`/api/v1/admin/order/${id}`);

        dispatch({
            type: DELETE_ORDER_SUCCESS,
            payload: data.success,
        })

    } catch (error) {
        dispatch({
            type: DELETE_ORDER_FAIL,
            payload: error.response.data.message,
        });
    }
};

// Clear All Errors
export const clearErrors = () => (dispatch) => {
    dispatch({ type: CLEAR_ERRORS });
}

// ── Cancel Order (customer) ────────────────────────────────────────
export const cancelOrder = (id, reason) => async (dispatch) => {
    try {
        dispatch({ type: "CANCEL_ORDER_REQUEST" });
        const { data } = await axios.put(`/api/v1/order/${id}/cancel`, { reason }, { headers: { "Content-Type": "application/json" } });
        dispatch({ type: "CANCEL_ORDER_SUCCESS", payload: data.success });
    } catch (error) {
        dispatch({ type: "CANCEL_ORDER_FAIL", payload: error.response?.data?.message || error.message });
    }
};

// ── Request Return (customer) ──────────────────────────────────────
export const requestReturn = (id, body) => async (dispatch) => {
    try {
        dispatch({ type: "RETURN_ORDER_REQUEST" });
        const { data } = await axios.post(`/api/v1/order/${id}/return`, body, { headers: { "Content-Type": "application/json" } });
        dispatch({ type: "RETURN_ORDER_SUCCESS", payload: data.success });
    } catch (error) {
        dispatch({ type: "RETURN_ORDER_FAIL", payload: error.response?.data?.message || error.message });
    }
};

// ── Get Tracking ───────────────────────────────────────────────────
export const getTracking = (id) => async (dispatch) => {
    try {
        dispatch({ type: "TRACKING_REQUEST" });
        const { data } = await axios.get(`/api/v1/order/${id}/tracking`);
        dispatch({ type: "TRACKING_SUCCESS", payload: data });
    } catch (error) {
        dispatch({ type: "TRACKING_FAIL", payload: error.response?.data?.message || error.message });
    }
};

// ── Admin: Create Shipment ─────────────────────────────────────────
export const createShipment = (id, body) => async (dispatch) => {
    try {
        dispatch({ type: "CREATE_SHIPMENT_REQUEST" });
        const { data } = await axios.post(`/api/v1/admin/order/${id}/ship`, body || {}, { headers: { "Content-Type": "application/json" } });
        dispatch({ type: "CREATE_SHIPMENT_SUCCESS", payload: data });
    } catch (error) {
        dispatch({ type: "CREATE_SHIPMENT_FAIL", payload: error.response?.data?.message || error.message });
    }
};

// ── Admin: Process Return ──────────────────────────────────────────
export const processReturn = (id, body) => async (dispatch) => {
    try {
        dispatch({ type: "PROCESS_RETURN_REQUEST" });
        const { data } = await axios.put(`/api/v1/admin/order/${id}/return`, body, { headers: { "Content-Type": "application/json" } });
        dispatch({ type: "PROCESS_RETURN_SUCCESS", payload: data.success });
    } catch (error) {
        dispatch({ type: "PROCESS_RETURN_FAIL", payload: error.response?.data?.message || error.message });
    }
};

// ── Admin: Complete Refund ─────────────────────────────────────────
export const completeRefund = (id, body) => async (dispatch) => {
    try {
        dispatch({ type: "REFUND_ORDER_REQUEST" });
        const { data } = await axios.put(`/api/v1/admin/order/${id}/refund`, body || {}, { headers: { "Content-Type": "application/json" } });
        dispatch({ type: "REFUND_ORDER_SUCCESS", payload: data.success });
    } catch (error) {
        dispatch({ type: "REFUND_ORDER_FAIL", payload: error.response?.data?.message || error.message });
    }
};
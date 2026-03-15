import { NEW_ORDER_REQUEST, NEW_ORDER_SUCCESS, NEW_ORDER_FAIL, CLEAR_ERRORS, MY_ORDERS_FAIL, MY_ORDERS_SUCCESS, MY_ORDERS_REQUEST, PAYMENT_STATUS_REQUEST, PAYMENT_STATUS_SUCCESS, PAYMENT_STATUS_FAIL, ORDER_DETAILS_REQUEST, ORDER_DETAILS_SUCCESS, ORDER_DETAILS_FAIL, ALL_ORDERS_REQUEST, ALL_ORDERS_SUCCESS, ALL_ORDERS_FAIL, UPDATE_ORDER_REQUEST, DELETE_ORDER_REQUEST, UPDATE_ORDER_SUCCESS, DELETE_ORDER_SUCCESS, UPDATE_ORDER_FAIL, DELETE_ORDER_FAIL, UPDATE_ORDER_RESET, DELETE_ORDER_RESET } from "../constants/orderConstants";

export const newOrderReducer = (state = {}, { type, payload }) => {
    switch (type) {
        case NEW_ORDER_REQUEST:
            return {
                ...state,
                loading: true,
            };
        case NEW_ORDER_SUCCESS:
            return {
                loading: false,
                order: payload,
            };
        case NEW_ORDER_FAIL:
            return {
                loading: false,
                error: payload,
            };
        case CLEAR_ERRORS:
            return {
                ...state,
                error: null,
            };
        default:
            return state;
    }
};

export const myOrdersReducer = (state = { orders: [] }, { type, payload }) => {
    switch (type) {
        case MY_ORDERS_REQUEST:
            return {
                loading: true,
            };
        case MY_ORDERS_SUCCESS:
            return {
                loading: false,
                orders: payload,
            };
        case MY_ORDERS_FAIL:
            return {
                loading: false,
                error: payload,
            };
        case CLEAR_ERRORS:
            return {
                ...state,
                error: null,
            };
        default:
            return state;
    }
};

export const paymentStatusReducer = (state = { txn: {} }, { type, payload }) => {
    switch (type) {
        case PAYMENT_STATUS_REQUEST:
            return {
                loading: true,
            };
        case PAYMENT_STATUS_SUCCESS:
            return {
                loading: false,
                txn: payload,
            };
        case PAYMENT_STATUS_FAIL:
            return {
                loading: false,
                error: payload,
            };
        case CLEAR_ERRORS:
            return {
                ...state,
                error: null,
            };
        default:
            return state;
    }
};

export const orderDetailsReducer = (state = { order: {} }, { type, payload }) => {
    switch (type) {
        case ORDER_DETAILS_REQUEST:
            return {
                loading: true,
            };
        case ORDER_DETAILS_SUCCESS:
            return {
                loading: false,
                order: payload,
            };
        case ORDER_DETAILS_FAIL:
            return {
                loading: false,
                error: payload,
            };
        case CLEAR_ERRORS:
            return {
                ...state,
                error: null,
            };
        default:
            return state;
    }
};


export const allOrdersReducer = (state = { orders: [] }, { type, payload }) => {
    switch (type) {
        case ALL_ORDERS_REQUEST:
            return {
                loading: true,
            };
        case ALL_ORDERS_SUCCESS:
            return {
                loading: false,
                orders: payload,
            };
        case ALL_ORDERS_FAIL:
            return {
                loading: false,
                error: payload,
            };
        case CLEAR_ERRORS:
            return {
                ...state,
                error: null,
            };
        default:
            return state;
    }
};

export const orderReducer = (state = {}, { type, payload }) => {
    switch (type) {
        case UPDATE_ORDER_REQUEST:
        case DELETE_ORDER_REQUEST:
            return {
                ...state,
                loading: true,
            };
        case UPDATE_ORDER_SUCCESS:
            return {
                ...state,
                loading: false,
                isUpdated: payload,
            };
        case DELETE_ORDER_SUCCESS:
            return {
                ...state,
                loading: false,
                isDeleted: payload,
            };
        case UPDATE_ORDER_FAIL:
        case DELETE_ORDER_FAIL:
            return {
                ...state,
                loading: false,
                error: payload,
            };
        case UPDATE_ORDER_RESET:
            return {
                ...state,
                isUpdated: false,
            };
        case DELETE_ORDER_RESET:
            return {
                ...state,
                isDeleted: false,
            };
        case CLEAR_ERRORS:
            return {
                ...state,
                error: null,
            };
        default:
            return state;
    }
};

// ── Tracking reducer ───────────────────────────────────────────────

export const trackingReducer = (state = { tracking: null }, { type, payload }) => {
    switch (type) {
        case 'TRACKING_REQUEST':
            return { loading: true };
        case 'TRACKING_SUCCESS':
            return { loading: false, tracking: payload };
        case 'TRACKING_FAIL':
            return { loading: false, error: payload };
        case CLEAR_ERRORS:
            return { ...state, error: null };
        default:
            return state;
    }
};

// ── Cancel order reducer ───────────────────────────────────────────

export const cancelOrderReducer = (state = {}, { type, payload }) => {
    switch (type) {
        case 'CANCEL_ORDER_REQUEST':
            return { loading: true };
        case 'CANCEL_ORDER_SUCCESS':
            return { loading: false, isCancelled: payload };
        case 'CANCEL_ORDER_FAIL':
            return { loading: false, error: payload };
        case 'CANCEL_ORDER_RESET':
            return { ...state, isCancelled: false };
        case CLEAR_ERRORS:
            return { ...state, error: null };
        default:
            return state;
    }
};

// ── Return request reducer ─────────────────────────────────────────

export const returnOrderReducer = (state = {}, { type, payload }) => {
    switch (type) {
        case 'RETURN_ORDER_REQUEST':
            return { loading: true };
        case 'RETURN_ORDER_SUCCESS':
            return { loading: false, isReturned: payload };
        case 'RETURN_ORDER_FAIL':
            return { loading: false, error: payload };
        case 'RETURN_ORDER_RESET':
            return { ...state, isReturned: false };
        case CLEAR_ERRORS:
            return { ...state, error: null };
        default:
            return state;
    }
};

// ── Create shipment reducer (admin) ────────────────────────────────

export const createShipmentReducer = (state = {}, { type, payload }) => {
    switch (type) {
        case 'CREATE_SHIPMENT_REQUEST':
            return { loading: true };
        case 'CREATE_SHIPMENT_SUCCESS':
            return { loading: false, isCreated: payload };
        case 'CREATE_SHIPMENT_FAIL':
            return { loading: false, error: payload };
        case 'CREATE_SHIPMENT_RESET':
            return { ...state, isCreated: false };
        case CLEAR_ERRORS:
            return { ...state, error: null };
        default:
            return state;
    }
};
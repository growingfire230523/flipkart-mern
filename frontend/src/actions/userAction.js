import {
    LOGIN_USER_REQUEST,
    LOGIN_USER_SUCCESS,
    LOGIN_USER_FAIL,
    REGISTER_USER_REQUEST,
    REGISTER_USER_SUCCESS,
    REGISTER_USER_FAIL,
    LOAD_USER_REQUEST,
    LOAD_USER_SUCCESS,
    LOAD_USER_FAIL,
    LOGOUT_USER_SUCCESS,
    LOGOUT_USER_FAIL,
    CLEAR_ERRORS,
    UPDATE_PROFILE_REQUEST,
    UPDATE_PROFILE_SUCCESS,
    UPDATE_PROFILE_FAIL,
    UPDATE_PASSWORD_REQUEST,
    UPDATE_PASSWORD_SUCCESS,
    UPDATE_PASSWORD_FAIL,
    FORGOT_PASSWORD_REQUEST,
    FORGOT_PASSWORD_SUCCESS,
    FORGOT_PASSWORD_FAIL,
    RESET_PASSWORD_SUCCESS,
    RESET_PASSWORD_FAIL,
    RESET_PASSWORD_REQUEST,
    UPDATE_USER_REQUEST,
    UPDATE_USER_SUCCESS,
    UPDATE_USER_FAIL,
    DELETE_USER_REQUEST,
    DELETE_USER_SUCCESS,
    DELETE_USER_FAIL,
    USER_DETAILS_REQUEST,
    USER_DETAILS_SUCCESS,
    USER_DETAILS_FAIL,
    ALL_USERS_FAIL,
    ALL_USERS_SUCCESS,
    ALL_USERS_REQUEST,
} from '../constants/userConstants';
import axios from 'axios';
import { EMPTY_CART, SAVE_SHIPPING_INFO, SET_CART_ITEMS } from '../constants/cartConstants';
import { SET_WISHLIST_ITEMS } from '../constants/wishlistConstants';
import { SET_SAVE_FOR_LATER_ITEMS } from '../constants/saveForLaterConstants';
import { SET_COMPARE_ITEMS } from '../constants/compareConstants';
import {
    loadCartItemsFromStorageOrLegacy,
    loadShippingInfoFromStorageOrLegacy,
    loadWishlistItemsFromStorageOrLegacy,
    loadSaveForLaterItemsFromStorageOrLegacy,
    loadCompareItemsFromStorage,
    migrateLegacyCartStorage,
    migrateLegacyWishlistStorage,
    migrateLegacySaveForLaterStorage,
    mergeGuestCompareIntoUserIfEmpty,
    setActiveUserId,
    getActiveUserId,
} from '../utils/cartStorage';

// Login User
export const loginUser = (email, password) => async (dispatch) => {
    try {

        dispatch({ type: LOGIN_USER_REQUEST });

        const config = {
            headers: {
                "Content-Type": "application/json",
            },
        }

        const { data } = await axios.post(
            '/api/v1/login',
            { email, password },
            config
        );

        const userId = data?.user?._id;
        setActiveUserId(userId);
        migrateLegacyCartStorage(userId);
        migrateLegacyWishlistStorage(userId);
        migrateLegacySaveForLaterStorage(userId);
        mergeGuestCompareIntoUserIfEmpty(userId);

        dispatch({
            type: LOGIN_USER_SUCCESS,
            payload: data.user,
        });

        dispatch({ type: SET_CART_ITEMS, payload: loadCartItemsFromStorageOrLegacy(userId) });
        dispatch({ type: SAVE_SHIPPING_INFO, payload: loadShippingInfoFromStorageOrLegacy(userId) });
        dispatch({ type: SET_WISHLIST_ITEMS, payload: loadWishlistItemsFromStorageOrLegacy(userId) });
        dispatch({ type: SET_SAVE_FOR_LATER_ITEMS, payload: loadSaveForLaterItemsFromStorageOrLegacy(userId) });
        dispatch({ type: SET_COMPARE_ITEMS, payload: loadCompareItemsFromStorage(userId) });

    } catch (error) {
        dispatch({
            type: LOGIN_USER_FAIL,
            payload: error.response.data.message,
        });
    }
};

// Register User
export const registerUser = (userData) => async (dispatch) => {
    try {

        dispatch({ type: REGISTER_USER_REQUEST });

        const config = {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        }

        const { data } = await axios.post(
            '/api/v1/register',
            userData,
            config
        );

        const userId = data?.user?._id;
        setActiveUserId(userId);
        migrateLegacyCartStorage(userId);
        migrateLegacyWishlistStorage(userId);
        migrateLegacySaveForLaterStorage(userId);
        mergeGuestCompareIntoUserIfEmpty(userId);

        dispatch({
            type: REGISTER_USER_SUCCESS,
            payload: data.user,
        });

        dispatch({ type: SET_CART_ITEMS, payload: loadCartItemsFromStorageOrLegacy(userId) });
        dispatch({ type: SAVE_SHIPPING_INFO, payload: loadShippingInfoFromStorageOrLegacy(userId) });
        dispatch({ type: SET_WISHLIST_ITEMS, payload: loadWishlistItemsFromStorageOrLegacy(userId) });
        dispatch({ type: SET_SAVE_FOR_LATER_ITEMS, payload: loadSaveForLaterItemsFromStorageOrLegacy(userId) });
        dispatch({ type: SET_COMPARE_ITEMS, payload: loadCompareItemsFromStorage(userId) });

    } catch (error) {
        dispatch({
            type: REGISTER_USER_FAIL,
            payload: error.response.data.message,
        });
    }
};

// Load User
export const loadUser = () => async (dispatch) => {
    try {

        dispatch({ type: LOAD_USER_REQUEST });

        const { data } = await axios.get('/api/v1/me');

        const userId = data?.user?._id;
        setActiveUserId(userId);
        migrateLegacyCartStorage(userId);
        migrateLegacyWishlistStorage(userId);
        migrateLegacySaveForLaterStorage(userId);
        mergeGuestCompareIntoUserIfEmpty(userId);

        dispatch({
            type: LOAD_USER_SUCCESS,
            payload: data.user,
        });

        dispatch({ type: SET_CART_ITEMS, payload: loadCartItemsFromStorageOrLegacy(userId) });
        dispatch({ type: SAVE_SHIPPING_INFO, payload: loadShippingInfoFromStorageOrLegacy(userId) });
        dispatch({ type: SET_WISHLIST_ITEMS, payload: loadWishlistItemsFromStorageOrLegacy(userId) });
        dispatch({ type: SET_SAVE_FOR_LATER_ITEMS, payload: loadSaveForLaterItemsFromStorageOrLegacy(userId) });
        dispatch({ type: SET_COMPARE_ITEMS, payload: loadCompareItemsFromStorage(userId) });

    } catch (error) {
        dispatch({
            type: LOAD_USER_FAIL,
            payload: error.response.data.message,
        });
    }
};

// Logout User
export const logoutUser = () => async (dispatch) => {
    try {
        await axios.get('/api/v1/logout');
        // Clear in-memory cart for safety, but keep per-user storage so logging back in restores it.
        dispatch({ type: EMPTY_CART });
        dispatch({ type: SAVE_SHIPPING_INFO, payload: {} });

        setActiveUserId(null);

        // Switch to guest cart if any exists in storage.
        dispatch({ type: SET_CART_ITEMS, payload: loadCartItemsFromStorageOrLegacy(null) });
        dispatch({ type: SAVE_SHIPPING_INFO, payload: loadShippingInfoFromStorageOrLegacy(null) });
        dispatch({ type: SET_WISHLIST_ITEMS, payload: loadWishlistItemsFromStorageOrLegacy(null) });
        dispatch({ type: SET_SAVE_FOR_LATER_ITEMS, payload: loadSaveForLaterItemsFromStorageOrLegacy(null) });
        dispatch({ type: SET_COMPARE_ITEMS, payload: loadCompareItemsFromStorage(null) });

        dispatch({ type: LOGOUT_USER_SUCCESS });
    } catch (error) {
        dispatch({
            type: LOGOUT_USER_FAIL,
            payload: error.response.data.message,
        });
    }
};

// Update User
export const updateProfile = (userData) => async (dispatch) => {
    try {

        dispatch({ type: UPDATE_PROFILE_REQUEST });

        const config = {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        }

        const { data } = await axios.put(
            '/api/v1/me/update',
            userData,
            config
        );

        dispatch({
            type: UPDATE_PROFILE_SUCCESS,
            payload: data.success,
        });

    } catch (error) {
        dispatch({
            type: UPDATE_PROFILE_FAIL,
            payload: error.response.data.message,
        });
    }
};

// Update User Password
export const updatePassword = (passwords) => async (dispatch) => {
    try {

        dispatch({ type: UPDATE_PASSWORD_REQUEST });

        const { data } = await axios.put(
            '/api/v1/password/update',
            passwords
        );

        dispatch({
            type: UPDATE_PASSWORD_SUCCESS,
            payload: data.success,
        });

    } catch (error) {
        dispatch({
            type: UPDATE_PASSWORD_FAIL,
            payload: error.response.data.message,
        });
    }
};


// Forgot Password
export const forgotPassword = (email) => async (dispatch) => {
    try {

        dispatch({ type: FORGOT_PASSWORD_REQUEST });

        const { data } = await axios.post(
            '/api/v1/password/forgot',
            email,
        );

        dispatch({
            type: FORGOT_PASSWORD_SUCCESS,
            payload: data.message,
        });

    } catch (error) {
        dispatch({
            type: FORGOT_PASSWORD_FAIL,
            payload: error.response.data.message,
        });
    }
};

// Reset Password
export const resetPassword = (token, passwords) => async (dispatch) => {
    try {

        dispatch({ type: RESET_PASSWORD_REQUEST });

        const { data } = await axios.put(
            `/api/v1/password/reset/${token}`,
            passwords
        );

        dispatch({
            type: RESET_PASSWORD_SUCCESS,
            payload: data.success,
        });

    } catch (error) {
        dispatch({
            type: RESET_PASSWORD_FAIL,
            payload: error.response.data.message,
        });
    }
};

// Get All Users ---ADMIN
export const getAllUsers = () => async (dispatch) => {
    try {

        dispatch({ type: ALL_USERS_REQUEST });
        const { data } = await axios.get('/api/v1/admin/users');
        dispatch({
            type: ALL_USERS_SUCCESS,
            payload: data.users,
        });

    } catch (error) {
        dispatch({
            type: ALL_USERS_FAIL,
            payload: error.response.data.message,
        });
    }
};

// Get User Details ---ADMIN
export const getUserDetails = (id) => async (dispatch) => {
    try {

        dispatch({ type: USER_DETAILS_REQUEST });
        const { data } = await axios.get(`/api/v1/admin/user/${id}`);

        dispatch({
            type: USER_DETAILS_SUCCESS,
            payload: data.user,
        });

    } catch (error) {
        dispatch({
            type: USER_DETAILS_FAIL,
            payload: error.response.data.message,
        });
    }
};

// Update User Details ---ADMIN
export const updateUser = (id, userData) => async (dispatch) => {
    try {

        dispatch({ type: UPDATE_USER_REQUEST });

        const config = {
            headers: {
                "Content-Type": "application/json",
            },
        }

        const { data } = await axios.put(
            `/api/v1/admin/user/${id}`,
            userData,
            config
        );

        dispatch({
            type: UPDATE_USER_SUCCESS,
            payload: data.success,
        });

    } catch (error) {
        dispatch({
            type: UPDATE_USER_FAIL,
            payload: error.response.data.message,
        });
    }
};

// Delete User ---ADMIN
export const deleteUser = (id) => async (dispatch) => {
    try {

        dispatch({ type: DELETE_USER_REQUEST });
        const { data } = await axios.delete(`/api/v1/admin/user/${id}`);

        dispatch({
            type: DELETE_USER_SUCCESS,
            payload: data.success,
        });

    } catch (error) {
        dispatch({
            type: DELETE_USER_FAIL,
            payload: error.response.data.message,
        });
    }
};

// Clear All Errors
export const clearErrors = () => async (dispatch) => {
    dispatch({ type: CLEAR_ERRORS });
};

// Login with Google
export const loginWithGoogle = (credential) => async (dispatch) => {
    try {
        dispatch({ type: LOGIN_USER_REQUEST });

        const config = {
            headers: {
                "Content-Type": "application/json",
            },
        };

        const { data } = await axios.post(
            '/api/v1/oauth/google',
            { credential },
            config
        );

        const userId = data?.user?._id;
        setActiveUserId(userId);
        migrateLegacyCartStorage(userId);
        migrateLegacyWishlistStorage(userId);
        migrateLegacySaveForLaterStorage(userId);
        mergeGuestCompareIntoUserIfEmpty(userId);

        dispatch({
            type: LOGIN_USER_SUCCESS,
            payload: data.user,
        });

        dispatch({ type: SET_CART_ITEMS, payload: loadCartItemsFromStorageOrLegacy(userId) });
        dispatch({ type: SAVE_SHIPPING_INFO, payload: loadShippingInfoFromStorageOrLegacy(userId) });
        dispatch({ type: SET_WISHLIST_ITEMS, payload: loadWishlistItemsFromStorageOrLegacy(userId) });
        dispatch({ type: SET_SAVE_FOR_LATER_ITEMS, payload: loadSaveForLaterItemsFromStorageOrLegacy(userId) });
        dispatch({ type: SET_COMPARE_ITEMS, payload: loadCompareItemsFromStorage(userId) });
    } catch (error) {
        dispatch({
            type: LOGIN_USER_FAIL,
            payload: error.response?.data?.message || error.message,
        });
    }
};

// Login with Phone OTP
export const loginWithPhoneOtp = (phone, otp) => async (dispatch) => {
    try {
        dispatch({ type: LOGIN_USER_REQUEST });

        const config = {
            headers: {
                "Content-Type": "application/json",
            },
        };

        const { data } = await axios.post(
            '/api/v1/phone/login/verify',
            { phone, otp },
            config
        );

        const userId = data?.user?._id;
        setActiveUserId(userId);
        migrateLegacyCartStorage(userId);
        migrateLegacyWishlistStorage(userId);
        migrateLegacySaveForLaterStorage(userId);
        mergeGuestCompareIntoUserIfEmpty(userId);

        dispatch({
            type: LOGIN_USER_SUCCESS,
            payload: data.user,
        });

        dispatch({ type: SET_CART_ITEMS, payload: loadCartItemsFromStorageOrLegacy(userId) });
        dispatch({ type: SAVE_SHIPPING_INFO, payload: loadShippingInfoFromStorageOrLegacy(userId) });
        dispatch({ type: SET_WISHLIST_ITEMS, payload: loadWishlistItemsFromStorageOrLegacy(userId) });
        dispatch({ type: SET_SAVE_FOR_LATER_ITEMS, payload: loadSaveForLaterItemsFromStorageOrLegacy(userId) });
        dispatch({ type: SET_COMPARE_ITEMS, payload: loadCompareItemsFromStorage(userId) });
    } catch (error) {
        dispatch({
            type: LOGIN_USER_FAIL,
            payload: error.response?.data?.message || error.message,
        });
    }
};

// Register with phone OTP (WhatsApp-primary)
// Step 1 – send OTP; returns { registrationToken } to hold in component state
export const sendPhoneRegisterOtp = ({ name, phone, email }) => async () => {
    const config = { headers: { 'Content-Type': 'application/json' } };
    const { data } = await axios.post('/api/v1/phone/register/otp', { name, phone, email }, config);
    return data; // { success, registrationToken, message }
};

// Step 2 – verify OTP + create account
export const verifyPhoneRegisterOtp = (registrationToken, otp) => async (dispatch) => {
    try {
        dispatch({ type: REGISTER_USER_REQUEST });

        const config = { headers: { 'Content-Type': 'application/json' } };
        const { data } = await axios.post('/api/v1/phone/register/verify', { registrationToken, otp }, config);

        const userId = data?.user?._id;
        setActiveUserId(userId);
        migrateLegacyCartStorage(userId);
        migrateLegacyWishlistStorage(userId);
        migrateLegacySaveForLaterStorage(userId);
        mergeGuestCompareIntoUserIfEmpty(userId);

        dispatch({ type: REGISTER_USER_SUCCESS, payload: data.user });

        dispatch({ type: SET_CART_ITEMS, payload: loadCartItemsFromStorageOrLegacy(userId) });
        dispatch({ type: SAVE_SHIPPING_INFO, payload: loadShippingInfoFromStorageOrLegacy(userId) });
        dispatch({ type: SET_WISHLIST_ITEMS, payload: loadWishlistItemsFromStorageOrLegacy(userId) });
        dispatch({ type: SET_SAVE_FOR_LATER_ITEMS, payload: loadSaveForLaterItemsFromStorageOrLegacy(userId) });
        dispatch({ type: SET_COMPARE_ITEMS, payload: loadCompareItemsFromStorage(userId) });
    } catch (error) {
        dispatch({ type: REGISTER_USER_FAIL, payload: error.response?.data?.message || error.message });
    }
};
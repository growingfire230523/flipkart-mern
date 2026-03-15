import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import { composeWithDevTools } from 'redux-devtools-extension';
import { forgotPasswordReducer, profileReducer, userReducer, allUsersReducer, userDetailsReducer } from './reducers/userReducer';
import { newProductReducer, newReviewReducer, productDetailsReducer, productReducer, productsReducer, productReviewsReducer, reviewReducer } from './reducers/productReducer';
import { cartReducer } from './reducers/cartReducer';
import { saveForLaterReducer } from './reducers/saveForLaterReducer';
import { allOrdersReducer, myOrdersReducer, newOrderReducer, orderDetailsReducer, orderReducer, paymentStatusReducer, trackingReducer, cancelOrderReducer, returnOrderReducer, createShipmentReducer } from './reducers/orderReducer';
import { wishlistReducer } from './reducers/wishlistReducer';
import { compareReducer } from './reducers/compareReducer';
import {
    getActiveUserId,
    loadCartItemsFromStorageOrLegacy,
    loadShippingInfoFromStorageOrLegacy,
    loadSaveForLaterItemsFromStorageOrLegacy,
    loadWishlistItemsFromStorageOrLegacy,
    loadCompareItemsFromStorage,
} from './utils/cartStorage';

const reducer = combineReducers({
    user: userReducer,
    profile: profileReducer,
    forgotPassword: forgotPasswordReducer,
    products: productsReducer,
    productDetails: productDetailsReducer,
    newReview: newReviewReducer,
    cart: cartReducer,
    saveForLater: saveForLaterReducer,
    newOrder: newOrderReducer,
    myOrders: myOrdersReducer,
    paymentStatus: paymentStatusReducer,
    orderDetails: orderDetailsReducer,
    allOrders: allOrdersReducer,
    order: orderReducer,
    tracking: trackingReducer,
    cancelOrder: cancelOrderReducer,
    returnOrder: returnOrderReducer,
    createShipment: createShipmentReducer,
    newProduct: newProductReducer,
    product: productReducer,
    users: allUsersReducer,
    userDetails: userDetailsReducer,
    reviews: productReviewsReducer,
    review: reviewReducer,
    wishlist: wishlistReducer,
    compare: compareReducer,
});

const activeUserId = getActiveUserId();

let initialState = {
    cart: {
        cartItems: loadCartItemsFromStorageOrLegacy(activeUserId),
        shippingInfo: loadShippingInfoFromStorageOrLegacy(activeUserId),
    },
    saveForLater: {
        saveForLaterItems: loadSaveForLaterItemsFromStorageOrLegacy(activeUserId),
    },
    wishlist: {
        wishlistItems: loadWishlistItemsFromStorageOrLegacy(activeUserId),
    },
    compare: {
        compareItems: loadCompareItemsFromStorage(activeUserId),
    },
};

const middleware = [thunk];

const store = createStore(
    reducer,
    initialState,
    composeWithDevTools(applyMiddleware(...middleware))
);

export default store;
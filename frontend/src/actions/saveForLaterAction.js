import { REMOVE_FROM_SAVE_FOR_LATER, SAVE_FOR_LATER } from "../constants/saveForLaterConstants";
import { getActiveUserId, saveSaveForLaterItemsToStorage } from "../utils/cartStorage";

const resolveSaveForLaterOwnerId = (getState) => {
    const state = getState?.();
    return state?.user?.user?._id || getActiveUserId() || null;
};

// Save For Later
export const saveForLater = (id) => async (dispatch, getState) => {

    const cartItemsArr = getState().cart.cartItems;
    const product = cartItemsArr.find((i) => i.cartItemId === id || i.product === id)

    dispatch({
        type: SAVE_FOR_LATER,
        payload: product
    });

    const ownerId = resolveSaveForLaterOwnerId(getState);
    saveSaveForLaterItemsToStorage(ownerId, getState().saveForLater.saveForLaterItems);
}

// Remove From Save For Later
export const removeFromSaveForLater = (id) => async (dispatch, getState) => {

    dispatch({
        type: REMOVE_FROM_SAVE_FOR_LATER,
        payload: id,
    });

    const ownerId = resolveSaveForLaterOwnerId(getState);
    saveSaveForLaterItemsToStorage(ownerId, getState().saveForLater.saveForLaterItems);
}
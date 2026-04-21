import { useSelector } from 'react-redux';
import { RootState } from '../store';

export const useCart = () => {
  const { cartItems, shippingInfo } = useSelector((state: RootState) => state.cart);

  const totalPrice = cartItems.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
  const totalDiscount = cartItems.reduce((sum: number, item: any) => {
    const discount = (item.cuttedPrice - item.price) * item.quantity;
    return sum + (discount > 0 ? discount : 0);
  }, 0);

  return { cartItems, shippingInfo, totalPrice, totalDiscount, itemCount: cartItems.length };
};

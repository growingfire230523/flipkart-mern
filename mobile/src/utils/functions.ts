export const getDiscount = (price: number, cuttedPrice: number): string => {
  return (((cuttedPrice - price) / cuttedPrice) * 100).toFixed();
};

export const getDeliveryDate = (): string => {
  const deliveryDate = new Date();
  deliveryDate.setDate(new Date().getDate() + 7);
  return deliveryDate.toUTCString().substring(0, 11);
};

export const formatDate = (dt: string | Date): string => {
  return new Date(dt).toUTCString().substring(0, 16);
};

export const getRandomProducts = <T>(prodsArray: T[], n: number): T[] => {
  return [...prodsArray].sort(() => 0.5 - Math.random()).slice(0, n);
};

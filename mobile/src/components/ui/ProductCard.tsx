import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { getDiscount } from '../../utils/functions';
import { addToCart } from '../../store/slices/cartSlice';
import RatingStars from './RatingStars';
import Toast from 'react-native-toast-message';
import Svg, { Path } from 'react-native-svg';

interface ProductCardProps {
  product: any;
  compact?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, compact }) => {
  const router = useRouter();
  const dispatch = useDispatch();
  const discount = Number(getDiscount(product.price, product.cuttedPrice)) || 0;

  const handleQuickAdd = () => {
    dispatch(addToCart({
      cartItemId: `${product._id}:::`,
      product: product._id,
      name: product.name,
      seller: product.brand?.name || '',
      price: product.price,
      cuttedPrice: product.cuttedPrice,
      image: product.images?.[0]?.url,
      stock: product.stock || 10,
      quantity: 1,
      volume: '',
      size: '',
      colorName: '',
      colorHex: '',
    }));
    Toast.show({ type: 'success', text1: 'Added to Cart' });
  };

  return (
    <Pressable
      onPress={() => router.push(`/product/${product._id}`)}
      className={`bg-white rounded-xl shadow-sm overflow-hidden ${compact ? 'w-36' : 'flex-1'}`}
      style={compact ? { width: 144 } : undefined}
    >
      <View>
        <Image
          source={{ uri: product.images?.[0]?.url }}
          style={{ width: '100%', height: compact ? 144 : 176 }}
          contentFit="cover"
          transition={200}
        />
        {discount > 0 && (
          <View className="absolute top-2 right-2 bg-red-500 rounded-md px-1.5 py-0.5">
            <Text className="text-white text-[10px] font-roboto-bold">{discount}% OFF</Text>
          </View>
        )}
        <Pressable
          onPress={handleQuickAdd}
          className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-white shadow-sm items-center justify-center"
        >
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#875c43" strokeWidth={2}>
            <Path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
      </View>
      <View className="p-2">
        <Text className="text-xs text-gray-500 font-roboto-medium" numberOfLines={1}>
          {product.brand?.name || ''}
        </Text>
        <Text className="text-sm text-gray-800 font-roboto-medium mt-0.5" numberOfLines={2}>
          {product.name}
        </Text>
        <View className="flex-row items-center mt-1">
          <RatingStars rating={product.ratings} size={12} />
          <Text className="text-xs text-gray-400 ml-1">({product.numOfReviews})</Text>
        </View>
        <View className="flex-row items-center mt-1">
          <Text className="text-sm font-roboto-bold text-primary-darkBlue">
            ₹{product.price?.toLocaleString()}
          </Text>
          {product.cuttedPrice > product.price && (
            <>
              <Text className="text-xs text-gray-400 line-through ml-1.5">
                ₹{product.cuttedPrice?.toLocaleString()}
              </Text>
              <Text className="text-xs text-green-600 ml-1">
                {discount}% off
              </Text>
            </>
          )}
        </View>
      </View>
    </Pressable>
  );
};

export default ProductCard;

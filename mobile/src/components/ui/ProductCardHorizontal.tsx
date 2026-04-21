import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { getDiscount } from '../../utils/functions';

interface Props {
  product: any;
}

const ProductCardHorizontal: React.FC<Props> = ({ product }) => {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(`/product/${product._id || product.product}`)}
      className="flex-row bg-white rounded-xl shadow-sm overflow-hidden mb-2 mx-3"
    >
      <Image
        source={{ uri: product.images?.[0]?.url || product.image }}
        className="w-28 h-28"
        contentFit="cover"
        transition={200}
      />
      <View className="flex-1 p-3 justify-center">
        <Text className="text-sm font-roboto-medium text-gray-800" numberOfLines={2}>
          {product.name}
        </Text>
        <View className="flex-row items-center mt-1">
          <Text className="text-base font-roboto-bold text-primary-darkBlue">
            ₹{product.price?.toLocaleString()}
          </Text>
          {product.cuttedPrice > product.price && (
            <Text className="text-xs text-green-600 ml-2">
              {getDiscount(product.price, product.cuttedPrice)}% off
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
};

export default ProductCardHorizontal;

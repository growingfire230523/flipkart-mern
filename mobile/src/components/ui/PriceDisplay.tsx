import React from 'react';
import { View, Text } from 'react-native';
import { getDiscount } from '../../utils/functions';

interface PriceDisplayProps {
  price: number;
  cuttedPrice?: number;
  size?: 'sm' | 'md' | 'lg';
}

const PriceDisplay: React.FC<PriceDisplayProps> = ({ price, cuttedPrice, size = 'md' }) => {
  const textSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base';
  const strikeSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <View className="flex-row items-center">
      <Text className={`${textSize} font-roboto-bold text-primary-darkBlue`}>
        ₹{price?.toLocaleString()}
      </Text>
      {cuttedPrice && cuttedPrice > price && (
        <>
          <Text className={`${strikeSize} text-gray-400 line-through ml-2`}>
            ₹{cuttedPrice?.toLocaleString()}
          </Text>
          <Text className={`${strikeSize} text-green-600 ml-1.5`}>
            {getDiscount(price, cuttedPrice)}% off
          </Text>
        </>
      )}
    </View>
  );
};

export default PriceDisplay;

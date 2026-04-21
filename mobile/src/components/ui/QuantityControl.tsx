import React from 'react';
import { View, Text, Pressable } from 'react-native';

interface Props {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  maxStock?: number;
}

const QuantityControl: React.FC<Props> = ({ quantity, onIncrease, onDecrease, maxStock }) => {
  return (
    <View className="flex-row items-center bg-gray-100 rounded-lg overflow-hidden">
      <Pressable
        onPress={onDecrease}
        disabled={quantity <= 1}
        className="w-8 h-8 items-center justify-center"
      >
        <Text className={`text-lg font-roboto-bold ${quantity <= 1 ? 'text-gray-300' : 'text-primary-blue'}`}>
          −
        </Text>
      </Pressable>
      <Text className="w-8 text-center font-roboto-medium text-sm">{quantity}</Text>
      <Pressable
        onPress={onIncrease}
        disabled={maxStock !== undefined && quantity >= maxStock}
        className="w-8 h-8 items-center justify-center"
      >
        <Text
          className={`text-lg font-roboto-bold ${
            maxStock !== undefined && quantity >= maxStock ? 'text-gray-300' : 'text-primary-blue'
          }`}
        >
          +
        </Text>
      </Pressable>
    </View>
  );
};

export default QuantityControl;

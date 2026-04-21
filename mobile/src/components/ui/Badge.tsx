import React from 'react';
import { View, Text } from 'react-native';

interface Props {
  count: number;
  size?: 'sm' | 'md';
}

const Badge: React.FC<Props> = ({ count, size = 'sm' }) => {
  if (count <= 0) return null;

  return (
    <View
      className={`absolute -top-1.5 -right-1.5 bg-primary-orange rounded-full items-center justify-center ${
        size === 'sm' ? 'min-w-4 h-4 px-1' : 'min-w-5 h-5 px-1.5'
      }`}
    >
      <Text className={`text-white font-roboto-bold ${size === 'sm' ? 'text-[10px]' : 'text-xs'}`}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
};

export default Badge;

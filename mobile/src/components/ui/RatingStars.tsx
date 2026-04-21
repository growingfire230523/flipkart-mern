import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface Props {
  rating: number;
  size?: number;
  showCount?: boolean;
  count?: number;
}

const Star = ({ filled, size = 14 }: { filled: boolean; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? '#d6b36a' : '#e5e7eb'}>
    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </Svg>
);

const RatingStars: React.FC<Props> = ({ rating, size = 14, showCount, count }) => {
  return (
    <View className="flex-row items-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} filled={i <= Math.round(rating)} size={size} />
      ))}
      {showCount && count !== undefined && (
        <Text className="text-xs text-gray-500 ml-1">({count})</Text>
      )}
    </View>
  );
};

export default RatingStars;

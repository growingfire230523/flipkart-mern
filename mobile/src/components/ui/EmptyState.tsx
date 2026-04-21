import React from 'react';
import { View, Text } from 'react-native';

interface Props {
  icon?: string;
  title: string;
  subtitle?: string;
}

const EmptyState: React.FC<Props> = ({ title, subtitle }) => {
  return (
    <View className="flex-1 items-center justify-center py-20 px-8">
      <Text className="text-6xl mb-4">📦</Text>
      <Text className="text-lg font-roboto-bold text-gray-800 text-center">{title}</Text>
      {subtitle && (
        <Text className="text-sm text-gray-500 text-center mt-2">{subtitle}</Text>
      )}
    </View>
  );
};

export default EmptyState;

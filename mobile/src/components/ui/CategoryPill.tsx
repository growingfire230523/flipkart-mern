import React from 'react';
import { Text, Pressable } from 'react-native';

interface Props {
  label: string;
  isActive?: boolean;
  onPress: () => void;
}

const CategoryPill: React.FC<Props> = ({ label, isActive, onPress }) => {
  return (
    <Pressable
      onPress={onPress}
      className={`px-4 rounded-full mr-2 border items-center justify-center ${
        isActive
          ? 'bg-primary-blue border-primary-blue'
          : 'bg-white border-gray-200'
      }`}
      style={{ height: 34 }}
    >
      <Text
        className={`text-xs font-roboto-medium ${
          isActive ? 'text-white' : 'text-gray-700'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
};

export default CategoryPill;

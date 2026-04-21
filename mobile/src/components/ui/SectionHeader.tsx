import React from 'react';
import { View, Text, Pressable } from 'react-native';

interface Props {
  title: string;
  tagline?: string | null;
  onSeeAll?: () => void;
}

const SectionHeader: React.FC<Props> = ({ title, tagline, onSeeAll }) => {
  return (
    <View className="flex-row items-center justify-between px-4 mb-2 mt-4">
      <View className="flex-1">
        <Text className="text-lg font-brand-bold text-primary-darkBlue">{title}</Text>
        {tagline ? (
          <Text className="text-xs text-primary-grey mt-0.5">{tagline}</Text>
        ) : null}
      </View>
      {onSeeAll && (
        <Pressable onPress={onSeeAll}>
          <Text className="text-sm font-roboto-medium text-primary-blue">See All</Text>
        </Pressable>
      )}
    </View>
  );
};

export default SectionHeader;

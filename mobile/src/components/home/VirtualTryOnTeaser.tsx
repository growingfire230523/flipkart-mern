import React from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';

export default function VirtualTryOnTeaser() {
  return (
    <View className="mx-4 my-3 rounded-2xl overflow-hidden bg-[#fdf6f3]">
      <View className="relative">
        <Image
          source={require('../../../assets/images/Virtual_Try_On.jpg')}
          className="w-full h-48 opacity-70"
          contentFit="cover"
        />
        <View className="absolute inset-0 bg-white/70" />
        <View className="absolute inset-0 items-center justify-center px-6">
          <Text className="text-2xl font-brand-bold text-primary-darkBlue text-center">
            Virtual Try On
          </Text>
          <Text className="text-sm font-roboto-bold text-primary-orange uppercase tracking-widest mt-1">
            Coming Soon!
          </Text>
          <Text className="text-xs text-primary-grey text-center mt-2">
            An immersive, camera-powered experience to preview looks and shades before you buy.
          </Text>
        </View>
      </View>
    </View>
  );
}

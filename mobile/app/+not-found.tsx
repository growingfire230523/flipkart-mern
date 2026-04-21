import React from 'react';
import { Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-cream items-center justify-center px-8" edges={['top', 'bottom']}>
      <Text className="text-3xl font-brand-bold text-primary-darkBlue mb-2">404</Text>
      <Text className="text-sm text-primary-grey text-center font-roboto mb-8">
        This page does not exist in the LEXI app.
      </Text>
      <Pressable onPress={() => router.replace('/')} className="bg-primary-blue px-8 py-3.5 rounded-xl">
        <Text className="text-white font-roboto-bold">Back to home</Text>
      </Pressable>
    </SafeAreaView>
  );
}

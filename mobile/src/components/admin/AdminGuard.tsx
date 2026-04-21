import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useSelector((s: RootState) => s.user);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-cream items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color="#875c43" />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-cream px-6 justify-center" edges={['top']}>
        <Text className="text-2xl font-brand-bold text-primary-darkBlue mb-2">Sign in required</Text>
        <Text className="text-sm text-primary-grey mb-6">
          Log in with an admin account to open this section.
        </Text>
        <Pressable
          onPress={() => router.replace('/(auth)/login')}
          className="bg-primary-blue py-3.5 rounded-xl items-center mb-3"
        >
          <Text className="text-white font-roboto-bold">Go to login</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} className="py-3 items-center">
          <Text className="text-primary-blue font-roboto-medium">Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <SafeAreaView className="flex-1 bg-cream px-6 justify-center" edges={['top']}>
        <Text className="text-2xl font-brand-bold text-primary-darkBlue mb-2">Admin only</Text>
        <Text className="text-sm text-primary-grey mb-6">
          This area is restricted to administrators.
        </Text>
        <Pressable onPress={() => router.back()} className="bg-primary-blue py-3.5 rounded-xl items-center">
          <Text className="text-white font-roboto-bold">Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return <>{children}</>;
}

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../src/store';
import { loginUser, clearErrors } from '../../src/store/slices/userSlice';
import useGoogleAuth from '../../src/hooks/useGoogleAuth';
import Toast from 'react-native-toast-message';

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { loading, isAuthenticated, error } = useSelector((state: RootState) => state.user);
  const { promptAsync, isReady: googleReady } = useGoogleAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (error) {
      Toast.show({ type: 'error', text1: error });
      dispatch(clearErrors());
    }
    if (isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [error, isAuthenticated]);

  const handleLogin = () => {
    if (!email || !password) {
      Toast.show({ type: 'error', text1: 'Please fill all fields' });
      return;
    }
    dispatch(loginUser({ email, password }));
  };

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 8 }} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} className="mb-6">
            <Text className="text-primary-grey text-base">← Back</Text>
          </Pressable>

          <Text className="text-3xl font-brand-bold text-primary-darkBlue mb-2">Welcome Back</Text>
          <Text className="text-sm text-primary-grey mb-8">Login to your LEXI account</Text>

          <View className="mb-4">
            <Text className="text-sm font-roboto-medium text-gray-700 mb-1.5">Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base font-roboto text-gray-800"
            />
          </View>

          <View className="mb-2">
            <Text className="text-sm font-roboto-medium text-gray-700 mb-1.5">Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base font-roboto text-gray-800"
            />
          </View>

          <Pressable onPress={() => router.push('/(auth)/forgot-password')} className="self-end mb-6">
            <Text className="text-sm text-primary-blue font-roboto-medium">Forgot Password?</Text>
          </Pressable>

          <Pressable
            onPress={handleLogin}
            disabled={loading}
            className={`py-4 rounded-xl items-center ${loading ? 'bg-primary-grey' : 'bg-primary-blue'}`}
          >
            <Text className="text-white font-roboto-bold text-base">
              {loading ? 'Logging in...' : 'Login'}
            </Text>
          </Pressable>

          <View className="flex-row items-center my-6">
            <View className="flex-1 h-px bg-gray-200" />
            <Text className="mx-4 text-xs text-primary-grey">OR</Text>
            <View className="flex-1 h-px bg-gray-200" />
          </View>

          <Pressable
            onPress={() => promptAsync()}
            disabled={!googleReady}
            className={`py-3.5 rounded-xl items-center border border-gray-200 bg-white mb-3 ${!googleReady ? 'opacity-50' : ''}`}
          >
            <Text className="text-base font-roboto-medium text-gray-700">Sign in with Google</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(auth)/phone-login' as any)}
            className="py-3.5 rounded-xl items-center border border-gray-200 bg-white"
          >
            <Text className="text-base font-roboto-medium text-gray-700">Login with Phone</Text>
          </Pressable>

          <View className="flex-row items-center justify-center mt-6">
            <Text className="text-sm text-gray-500">Don't have an account? </Text>
            <Pressable onPress={() => router.replace('/(auth)/register')}>
              <Text className="text-sm font-roboto-bold text-primary-blue">Register</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../src/store';
import { forgotPassword, clearErrors, clearMessage } from '../../src/store/slices/userSlice';
import Toast from 'react-native-toast-message';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error, message } = useSelector((state: RootState) => state.user);
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (error) {
      Toast.show({ type: 'error', text1: error });
      dispatch(clearErrors());
    }
    if (message) {
      Toast.show({ type: 'success', text1: message });
      dispatch(clearMessage());
    }
  }, [error, message]);

  const handleSubmit = () => {
    if (!email) {
      Toast.show({ type: 'error', text1: 'Please enter your email' });
      return;
    }
    dispatch(forgotPassword(email));
  };

  return (
    <SafeAreaView className="flex-1 bg-cream justify-center px-6">
      <Pressable onPress={() => router.back()} className="mb-8">
        <Text className="text-primary-grey text-base">← Back</Text>
      </Pressable>

      <Text className="text-3xl font-brand-bold text-primary-darkBlue mb-2">Forgot Password</Text>
      <Text className="text-sm text-primary-grey mb-8">
        Enter your email and we'll send you a link to reset your password
      </Text>

      <View className="mb-6">
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

      <Pressable
        onPress={handleSubmit}
        disabled={loading}
        className={`py-4 rounded-xl items-center ${loading ? 'bg-primary-grey' : 'bg-primary-blue'}`}
      >
        <Text className="text-white font-roboto-bold text-base">
          {loading ? 'Sending...' : 'Send Reset Link'}
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

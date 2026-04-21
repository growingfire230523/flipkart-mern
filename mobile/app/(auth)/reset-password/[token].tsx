import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../src/store';
import { resetPassword, clearErrors, resetUpdate } from '../../../src/store/slices/userSlice';
import Toast from 'react-native-toast-message';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error, isUpdated } = useSelector((state: RootState) => state.user);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (error) {
      Toast.show({ type: 'error', text1: error });
      dispatch(clearErrors());
    }
    if (isUpdated) {
      Toast.show({ type: 'success', text1: 'Password reset successful!' });
      dispatch(resetUpdate());
      router.replace('/(auth)/login');
    }
  }, [error, isUpdated]);

  const handleReset = () => {
    if (!password || !confirmPassword) {
      Toast.show({ type: 'error', text1: 'Please fill all fields' });
      return;
    }
    if (password !== confirmPassword) {
      Toast.show({ type: 'error', text1: 'Passwords do not match' });
      return;
    }
    dispatch(resetPassword({ token: token!, passwords: { password, confirmPassword } }));
  };

  return (
    <SafeAreaView className="flex-1 bg-cream justify-center px-6">
      <Text className="text-3xl font-brand-bold text-primary-darkBlue mb-2">Reset Password</Text>
      <Text className="text-sm text-primary-grey mb-8">Enter your new password</Text>

      <View className="mb-4">
        <Text className="text-sm font-roboto-medium text-gray-700 mb-1.5">New Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Enter new password"
          placeholderTextColor="#9ca3af"
          secureTextEntry
          className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base font-roboto text-gray-800"
        />
      </View>

      <View className="mb-6">
        <Text className="text-sm font-roboto-medium text-gray-700 mb-1.5">Confirm Password</Text>
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm new password"
          placeholderTextColor="#9ca3af"
          secureTextEntry
          className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base font-roboto text-gray-800"
        />
      </View>

      <Pressable
        onPress={handleReset}
        disabled={loading}
        className={`py-4 rounded-xl items-center ${loading ? 'bg-primary-grey' : 'bg-primary-blue'}`}
      >
        <Text className="text-white font-roboto-bold text-base">
          {loading ? 'Resetting...' : 'Reset Password'}
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

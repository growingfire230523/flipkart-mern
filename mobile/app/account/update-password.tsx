import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../src/store';
import { updatePassword, clearErrors, resetUpdate } from '../../src/store/slices/userSlice';
import Toast from 'react-native-toast-message';

export default function UpdatePasswordScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error, isUpdated } = useSelector((state: RootState) => state.user);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (error) {
      Toast.show({ type: 'error', text1: error });
      dispatch(clearErrors());
    }
    if (isUpdated) {
      Toast.show({ type: 'success', text1: 'Password changed!' });
      dispatch(resetUpdate());
      router.back();
    }
  }, [error, isUpdated]);

  const handleSubmit = () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Toast.show({ type: 'error', text1: 'Please fill all fields' });
      return;
    }
    if (newPassword !== confirmPassword) {
      Toast.show({ type: 'error', text1: 'Passwords do not match' });
      return;
    }
    dispatch(updatePassword({ oldPassword, newPassword, confirmPassword }));
  };

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Text className="text-lg text-primary-grey">←</Text>
        </Pressable>
        <Text className="text-xl font-brand-bold text-primary-darkBlue">Change Password</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        {[
          { label: 'Current Password', value: oldPassword, setter: setOldPassword },
          { label: 'New Password', value: newPassword, setter: setNewPassword },
          { label: 'Confirm New Password', value: confirmPassword, setter: setConfirmPassword },
        ].map((field) => (
          <View key={field.label} className="mb-4">
            <Text className="text-sm font-roboto-medium text-gray-700 mb-1.5">{field.label}</Text>
            <TextInput
              value={field.value}
              onChangeText={field.setter}
              secureTextEntry
              placeholder={field.label}
              placeholderTextColor="#9ca3af"
              className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base font-roboto text-gray-800"
            />
          </View>
        ))}

        <Pressable
          onPress={handleSubmit}
          disabled={loading}
          className={`py-4 rounded-xl items-center mt-2 ${loading ? 'bg-primary-grey' : 'bg-primary-blue'}`}
        >
          <Text className="text-white font-roboto-bold text-base">
            {loading ? 'Updating...' : 'Change Password'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../src/store';
import { loadUser } from '../../src/store/slices/userSlice';
import { phoneLoginRequestApi, phoneLoginVerifyApi } from '../../src/api/endpoints/auth';
import * as SecureStore from 'expo-secure-store';
import Toast from 'react-native-toast-message';

export default function PhoneLoginScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async () => {
    if (!phone.trim() || phone.trim().length < 10) {
      Toast.show({ type: 'error', text1: 'Please enter a valid phone number' });
      return;
    }
    setLoading(true);
    try {
      await phoneLoginRequestApi(phone.trim());
      Toast.show({ type: 'success', text1: 'OTP sent!' });
      setStep('otp');
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Failed to send OTP' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.trim().length < 4) {
      Toast.show({ type: 'error', text1: 'Please enter the OTP' });
      return;
    }
    setLoading(true);
    try {
      const { data } = await phoneLoginVerifyApi(phone.trim(), otp.trim());
      if (data.token) {
        await SecureStore.setItemAsync('authToken', data.token);
      }
      await dispatch(loadUser()).unwrap();
      router.replace('/(tabs)');
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Verification failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <View style={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
          <Pressable onPress={() => step === 'otp' ? setStep('phone') : router.back()} className="mb-8">
            <Text className="text-primary-grey text-base">← Back</Text>
          </Pressable>

          <Text className="text-3xl font-brand-bold text-primary-darkBlue mb-2">
            {step === 'phone' ? 'Phone Login' : 'Enter OTP'}
          </Text>
          <Text className="text-sm text-primary-grey mb-8">
            {step === 'phone' ? 'We\'ll send you a one-time password' : `OTP sent to ${phone}`}
          </Text>

          {step === 'phone' ? (
            <>
              <Text className="text-sm font-roboto-medium text-gray-700 mb-1.5">Phone Number</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter your phone number"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
                maxLength={15}
                className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base font-roboto text-gray-800 mb-6"
              />
              <Pressable
                onPress={handleRequestOtp}
                disabled={loading}
                className={`py-4 rounded-xl items-center ${loading ? 'bg-primary-grey' : 'bg-primary-blue'}`}
              >
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <Text className="text-white font-roboto-bold text-base">Send OTP</Text>
                )}
              </Pressable>
            </>
          ) : (
            <>
              <Text className="text-sm font-roboto-medium text-gray-700 mb-1.5">OTP</Text>
              <TextInput
                value={otp}
                onChangeText={setOtp}
                placeholder="Enter 6-digit OTP"
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
                maxLength={6}
                className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base font-roboto text-gray-800 mb-6 text-center tracking-widest text-lg"
              />
              <Pressable
                onPress={handleVerifyOtp}
                disabled={loading}
                className={`py-4 rounded-xl items-center ${loading ? 'bg-primary-grey' : 'bg-primary-blue'}`}
              >
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <Text className="text-white font-roboto-bold text-base">Verify & Login</Text>
                )}
              </Pressable>
              <Pressable onPress={handleRequestOtp} disabled={loading} className="mt-4 items-center">
                <Text className="text-sm text-primary-blue font-roboto-medium">Resend OTP</Text>
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

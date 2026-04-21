import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import { AppDispatch, RootState } from '../../src/store';
import { registerUser, clearErrors } from '../../src/store/slices/userSlice';
import Toast from 'react-native-toast-message';

export default function RegisterScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { loading, isAuthenticated, error } = useSelector((state: RootState) => state.user);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('');
  const [password, setPassword] = useState('');
  const [cpassword, setCpassword] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      Toast.show({ type: 'error', text1: error });
      dispatch(clearErrors());
    }
    if (isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [error, isAuthenticated]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) {
      setAvatar(result.assets[0].uri);
    }
  };

  const handleRegister = () => {
    if (!name || !email || !gender || !password || !cpassword) {
      Toast.show({ type: 'error', text1: 'Please fill all fields' });
      return;
    }
    if (password.length < 8) {
      Toast.show({ type: 'error', text1: 'Password must be at least 8 characters' });
      return;
    }
    if (password !== cpassword) {
      Toast.show({ type: 'error', text1: "Passwords don't match" });
      return;
    }
    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('gender', gender);
    formData.append('password', password);
    if (avatar) {
      formData.append('avatar', {
        uri: avatar,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      } as any);
    }
    dispatch(registerUser(formData));
  };

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 16 }} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} className="mb-4">
            <Text className="text-primary-grey text-base">← Back</Text>
          </Pressable>

          <Text className="text-3xl font-brand-bold text-primary-darkBlue mb-1">Create Account</Text>
          <Text className="text-sm text-primary-grey mb-5">Sign up to get started with LEXI</Text>

          {/* Avatar */}
          <View className="flex-row items-center mb-5">
            <Pressable onPress={pickImage}>
              <View className="w-16 h-16 rounded-full bg-gray-200 items-center justify-center overflow-hidden border-2 border-gray-300">
                {avatar ? (
                  <Image source={{ uri: avatar }} style={{ width: 64, height: 64 }} contentFit="cover" />
                ) : (
                  <Text className="text-2xl text-gray-400">+</Text>
                )}
              </View>
            </Pressable>
            <Pressable onPress={pickImage} className="ml-3 flex-1">
              <Text className="text-sm font-roboto-medium text-primary-blue">
                {avatar ? 'Change Avatar' : 'Upload Avatar (optional)'}
              </Text>
              <Text className="text-xs text-gray-400 mt-0.5">Tap to select a photo</Text>
            </Pressable>
          </View>

          <View className="mb-3">
            <Text className="text-sm font-roboto-medium text-gray-700 mb-1.5">Full Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              placeholderTextColor="#9ca3af"
              className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base font-roboto text-gray-800"
            />
          </View>

          <View className="mb-3">
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

          <View className="mb-3">
            <Text className="text-sm font-roboto-medium text-gray-700 mb-1.5">Gender</Text>
            <View className="flex-row">
              {['male', 'female'].map((g) => (
                <Pressable
                  key={g}
                  onPress={() => setGender(g)}
                  className={`flex-row items-center mr-4 px-4 py-2.5 rounded-xl border ${
                    gender === g ? 'border-primary-blue bg-primary-blue/10' : 'border-gray-200 bg-white'
                  }`}
                >
                  <View className={`w-5 h-5 rounded-full border-2 mr-2 items-center justify-center ${
                    gender === g ? 'border-primary-blue' : 'border-gray-300'
                  }`}>
                    {gender === g && <View className="w-2.5 h-2.5 rounded-full bg-primary-blue" />}
                  </View>
                  <Text className={`text-sm ${gender === g ? 'text-primary-blue font-roboto-medium' : 'text-gray-700'}`}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View className="flex-row mb-3" style={{ gap: 12 }}>
            <View className="flex-1">
              <Text className="text-sm font-roboto-medium text-gray-700 mb-1.5">Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Min 8 chars"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base font-roboto text-gray-800"
              />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-roboto-medium text-gray-700 mb-1.5">Confirm</Text>
              <TextInput
                value={cpassword}
                onChangeText={setCpassword}
                placeholder="Repeat"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base font-roboto text-gray-800"
              />
            </View>
          </View>

          <Pressable
            onPress={handleRegister}
            disabled={loading}
            className={`py-4 rounded-xl items-center mt-3 ${loading ? 'bg-primary-grey' : 'bg-primary-blue'}`}
          >
            <Text className="text-white font-roboto-bold text-base">
              {loading ? 'Creating Account...' : 'Sign Up'}
            </Text>
          </Pressable>

          <View className="flex-row items-center justify-center mt-5">
            <Text className="text-sm text-gray-500">Already have an account? </Text>
            <Pressable onPress={() => router.replace('/(auth)/login')}>
              <Text className="text-sm font-roboto-bold text-primary-blue">Login</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { AppDispatch, RootState } from '../../src/store';
import { updateProfile, loadUser, clearErrors, resetUpdate } from '../../src/store/slices/userSlice';
import Toast from 'react-native-toast-message';

export default function UpdateProfileScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user, loading, error, isUpdated } = useSelector((state: RootState) => state.user);

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      Toast.show({ type: 'error', text1: error });
      dispatch(clearErrors());
    }
    if (isUpdated) {
      Toast.show({ type: 'success', text1: 'Profile updated!' });
      dispatch(resetUpdate());
      dispatch(loadUser());
      router.back();
    }
  }, [error, isUpdated]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) setAvatar(result.assets[0].uri);
  };

  const handleSubmit = () => {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    if (avatar) {
      formData.append('avatar', { uri: avatar, type: 'image/jpeg', name: 'avatar.jpg' } as any);
    }
    dispatch(updateProfile(formData));
  };

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Text className="text-lg text-primary-grey">←</Text>
        </Pressable>
        <Text className="text-xl font-brand-bold text-primary-darkBlue">Update Profile</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        <Pressable onPress={pickImage} className="self-center mb-6 mt-4">
          <View className="w-24 h-24 rounded-full overflow-hidden bg-gray-200">
            <Image
              source={{ uri: avatar || user?.avatar?.url || 'https://via.placeholder.com/100' }}
              className="w-24 h-24"
              contentFit="cover"
            />
          </View>
          <Text className="text-xs text-primary-blue text-center mt-2">Change Photo</Text>
        </Pressable>

        <View className="mb-4">
          <Text className="text-sm font-roboto-medium text-gray-700 mb-1.5">Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base font-roboto text-gray-800"
          />
        </View>

        <View className="mb-6">
          <Text className="text-sm font-roboto-medium text-gray-700 mb-1.5">Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
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
            {loading ? 'Updating...' : 'Save Changes'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

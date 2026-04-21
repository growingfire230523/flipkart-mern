import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { imageSearchApi } from '../src/api/endpoints/imageSearch';
import Toast from 'react-native-toast-message';

export default function ImageSearchScreen() {
  const router = useRouter();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async (useCamera: boolean) => {
    let result;
    if (useCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Toast.show({ type: 'error', text1: 'Camera permission required' });
        return;
      }
      result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    }

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setImageUri(asset.uri);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('image', {
        uri: asset.uri,
        type: 'image/jpeg',
        name: 'search-image.jpg',
      } as any);

      const { data } = await imageSearchApi(formData);
      const query = data.query || data.keywords?.join(' ') || '';
      if (query) {
        router.replace({ pathname: '/products', params: { keyword: query } });
      } else {
        Toast.show({ type: 'info', text1: 'No matches found. Try another image.' });
        setLoading(false);
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Image search failed' });
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-cream items-center justify-center">
        {imageUri && (
          <Image source={{ uri: imageUri }} className="w-48 h-48 rounded-xl mb-6" contentFit="cover" />
        )}
        <ActivityIndicator size="large" color="#875c43" />
        <Text className="text-sm text-primary-grey mt-4">Searching for products...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <Pressable onPress={() => router.back()} className="px-4 py-3">
        <Text className="text-primary-grey text-base">← Back</Text>
      </Pressable>
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-4xl mb-4">📸</Text>
        <Text className="text-3xl font-brand-bold text-primary-darkBlue text-center mb-3">
          Image Search
        </Text>
        <Text className="text-sm text-primary-grey text-center mb-8">
          Take a photo or pick from gallery to find similar products
        </Text>

        <Pressable
          onPress={() => pickImage(true)}
          className="bg-primary-blue w-full py-4 rounded-xl items-center mb-3"
        >
          <Text className="text-white font-roboto-bold text-base">Take a Photo</Text>
        </Pressable>

        <Pressable
          onPress={() => pickImage(false)}
          className="border border-primary-blue w-full py-4 rounded-xl items-center"
        >
          <Text className="text-primary-blue font-roboto-bold text-base">Choose from Gallery</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

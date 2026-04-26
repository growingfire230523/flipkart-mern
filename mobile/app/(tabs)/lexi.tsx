import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

const features = [
  {
    title: 'Chat with Milaari',
    description: 'Your personal AI beauty assistant. Ask anything about skincare, makeup, and fragrance.',
    route: '/lexi-chat',
    image: require('../../assets/images/services/LEXI_AI_Chat_service.png'),
    gradient: ['#875c43', '#b76e79'] as const,
  },
  {
    title: 'Fragrance Finder',
    description: 'Take a quick quiz and discover your perfect fragrance match.',
    route: '/fragrance-finder',
    image: require('../../assets/images/services/LEXI_AI_FindMyFragrance_service.png'),
    gradient: ['#2a5f44', '#2f6f4e'] as const,
  },
  {
    title: 'Skin Analysis',
    description: 'Use your camera for AI-powered skin analysis and personalized recommendations.',
    route: '/lexi-recommendations',
    image: require('../../assets/images/services/LEXI_AI_Recommendation_service.png'),
    gradient: ['#d6b36a', '#b76e79'] as const,
  },
  {
    title: 'Make My Kit',
    description: 'Build a personalized product kit tailored to your needs.',
    route: '/make-my-kit',
    image: require('../../assets/images/services/LEXI_AI_MakeMyKit_service.png'),
    gradient: ['#b76e79', '#875c43'] as const,
  },
  {
    title: 'Image Search',
    description: 'Snap a photo or pick from gallery to find similar products.',
    route: '/image-search',
    gradient: ['#24171a', '#875c43'] as const,
  },
  {
    title: 'Community',
    description: 'Connect with beauty enthusiasts, read testimonials and get inspired.',
    route: '/community',
    gradient: ['#24171a', '#2a5f44'] as const,
  },
];

export default function MilaariScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="px-4 pt-4 pb-2">
          <Text className="text-3xl font-brand-bold text-primary-darkBlue">Milaari AI</Text>
          <Text className="text-sm text-primary-grey mt-1">
            Your intelligent beauty companion
          </Text>
        </View>

        <View className="px-4 mt-4">
          {features.map((feature, index) => (
            <Pressable
              key={index}
              onPress={() => router.push(feature.route as any)}
              className="mb-4 rounded-2xl overflow-hidden shadow-md"
            >
              <LinearGradient
                colors={[...feature.gradient]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ padding: 24, flexDirection: 'row', alignItems: 'center' }}
              >
                <View className="flex-1">
                  <Text className="text-xl font-roboto-bold text-white">{feature.title}</Text>
                  <Text className="text-sm text-white/80 mt-2">{feature.description}</Text>
                  <View className="flex-row items-center mt-4">
                    <Text className="text-sm font-roboto-medium text-white">Get Started</Text>
                    <Text className="text-white ml-2">→</Text>
                  </View>
                </View>
                {feature.image && (
                  <Image source={feature.image} className="w-20 h-20 rounded-xl ml-3" contentFit="cover" />
                )}
              </LinearGradient>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

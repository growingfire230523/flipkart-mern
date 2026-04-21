import React, { useEffect, useCallback, useState, useRef } from 'react';
import { ScrollView, View, Text, FlatList, Pressable, RefreshControl, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { imageSearchApi } from '../../src/api/endpoints/imageSearch';
import Toast from 'react-native-toast-message';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppDispatch, RootState } from '../../src/store';
import { getSliderProducts } from '../../src/store/slices/productSlice';
import SearchBar from '../../src/components/ui/SearchBar';
import ProductCard from '../../src/components/ui/ProductCard';
import SectionHeader from '../../src/components/ui/SectionHeader';
import HeroBannerApi from '../../src/components/home/HeroBannerApi';
import FlashDealSection from '../../src/components/home/FlashDealSection';
import DealOfDaySection from '../../src/components/home/DealOfDaySection';
import TopRatedSection from '../../src/components/home/TopRatedSection';
import BestSellerSection from '../../src/components/home/BestSellerSection';
import NewInSection from '../../src/components/home/NewInSection';
import PromoBannerSection from '../../src/components/home/PromoBannerSection';
import CategoryCollectionSection from '../../src/components/home/CategoryCollectionSection';
import HomeHighlightBanner from '../../src/components/home/HomeHighlightBanner';
import RecentlyViewedSection from '../../src/components/home/RecentlyViewedSection';
import NewsletterSection from '../../src/components/home/NewsletterSection';
import AiServicesSection from '../../src/components/home/AiServicesSection';
import AchievementsCarousel from '../../src/components/home/AchievementsCarousel';
import VirtualTryOnTeaser from '../../src/components/home/VirtualTryOnTeaser';
import { getMakeupPromoBannerApi, getPerfumePromoBannerApi, getSkincarePromoBannerApi } from '../../src/api/endpoints/banners';
import FooterSection from '../../src/components/home/FooterSection';
import { categories, offerProducts } from '../../src/utils/constants';
import { getRandomProducts } from '../../src/utils/functions';

let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEventSafe: (eventName: string, listener: (event: any) => void) => void = () => {};

try {
  const speech = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = speech.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEventSafe = speech.useSpeechRecognitionEvent;
} catch {
  // expo-speech-recognition is not available in Expo Go.
}

type CategoryNavBarProps = { activeCategory?: string | null };

function CategoryNavBar({ activeCategory }: CategoryNavBarProps) {
  const router = useRouter();

  const navItems: { label: string; onPress: () => void }[] = [
    {
      label: 'SHOP ALL',
      onPress: () => router.push('/products' as any),
    },
    {
      label: 'SHOP AT 99',
      onPress: () =>
        router.push({ pathname: '/products', params: { 'price[gte]': '0', 'price[lte]': '99' } } as any),
    },
    ...categories.map((cat) => ({
      label: cat,
      onPress: () => router.push({ pathname: '/products', params: { category: cat } } as any),
    })),
  ];

  return (
    <View className="mx-3 my-2">
      <View
        className="bg-primary-blue overflow-hidden"
        style={{ borderRadius: 999, shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 4 }}
      >
        <FlatList
          data={navItems}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 9, gap: 20 }}
          keyExtractor={(item) => item.label}
          renderItem={({ item }) => {
            const isActive = item.label === 'SHOP ALL'
              ? !activeCategory
              : item.label === activeCategory;
            return (
              <Pressable onPress={item.onPress}>
                <Text
                  className={`text-[13px] uppercase tracking-widest font-brand-medium text-white ${
                    isActive ? 'border-b border-white pb-0.5' : 'opacity-90'
                  }`}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>
    </View>
  );
}

function DealSliderSection({ title }: { title: string }) {
  const router = useRouter();
  const shuffled = getRandomProducts(offerProducts, 12);
  return (
    <View>
      <SectionHeader title={title} onSeeAll={() => router.push('/products')} />
      <FlatList
        data={shuffled}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        keyExtractor={(item, i) => `${item.name}-${i}`}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push('/products')}
            className="mr-3 bg-white rounded-xl overflow-hidden shadow-sm"
            style={{ width: 144 }}
          >
            <Image
              source={{ uri: item.image }}
              style={{ width: 144, height: 144 }}
              contentFit="contain"
              transition={200}
            />
            <View className="p-2">
              <Text className="text-xs font-roboto-bold text-gray-800" numberOfLines={1}>{item.name}</Text>
              <Text className="text-xs text-green-600 mt-0.5">{item.offer}</Text>
              <Text className="text-[10px] text-primary-grey">{item.tag}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

function ProductSliderSection({ title, tagline, products }: { title: string; tagline?: string | null; products: any[] }) {
  const router = useRouter();
  if (!products?.length) return null;
  const shuffled = getRandomProducts(products, 12);
  return (
    <View>
      <SectionHeader title={title} tagline={tagline} onSeeAll={() => router.push('/products')} />
      <FlatList
        data={shuffled}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View className="mr-3">
            <ProductCard product={item} compact />
          </View>
        )}
      />
    </View>
  );
}

export default function HomeScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { sliderProducts, loading } = useSelector((state: RootState) => state.products);
  const [refreshing, setRefreshing] = useState(false);
  const [key, setKey] = useState(0);
  const [isImageSearching, setIsImageSearching] = useState(false);

  // ── Voice search state (mirrors web SpeechRecognition logic) ──────────────
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const lastFinalTranscriptRef = useRef('');
  const stopRequestedRef = useRef(false);
  const noSpeechRetryRef = useRef(0);
  const hasSpeechModule = !!ExpoSpeechRecognitionModule?.start;

  // Mirror: recognition.onstart
  useSpeechRecognitionEventSafe('start', () => setIsRecording(true));

  // Mirror: recognition.onresult — shows interim results live in the search bar
  useSpeechRecognitionEventSafe('result', (event) => {
    try {
      const best = event.results?.[0];
      const transcript = String(best?.transcript || '').trim();
      if (!transcript) return;

      if (event.isFinal) {
        lastFinalTranscriptRef.current = transcript;
      }
      setLiveTranscript(transcript);
    } catch { /* ignore */ }
  });

  // Mirror: recognition.onend — auto-search with final transcript
  useSpeechRecognitionEventSafe('end', () => {
    setIsRecording(false);
    const text = lastFinalTranscriptRef.current.trim();
    setLiveTranscript('');
    lastFinalTranscriptRef.current = '';
    if (text) {
      router.push({ pathname: '/products', params: { keyword: text } } as any);
    }
  });

  // Mirror: recognition.onerror
  useSpeechRecognitionEventSafe('error', (event) => {
    const err = String(event?.error || '').toLowerCase();

    if (err === 'aborted') {
      setIsRecording(false);
      return;
    }
    if (err === 'no-speech') {
      // Retry once automatically, same as web
      if (!stopRequestedRef.current && noSpeechRetryRef.current < 1) {
        noSpeechRetryRef.current += 1;
        setIsRecording(false);
        setTimeout(() => {
          if (stopRequestedRef.current) return;
          startVoiceRecognition({ isRetry: true });
        }, 250);
        return;
      }
      setIsRecording(false);
      Toast.show({ type: 'info', text1: 'No voice detected. Please speak clearly and try again.' });
      return;
    }
    if (err.includes('not-allowed') || err.includes('permission') || err.includes('service-not-allowed')) {
      setIsRecording(false);
      Toast.show({ type: 'error', text1: 'Microphone permission denied.' });
      return;
    }
    if (err === 'audio-capture') {
      setIsRecording(false);
      Toast.show({ type: 'error', text1: 'No microphone found on this device.' });
      return;
    }
    if (err === 'network') {
      setIsRecording(false);
      Toast.show({ type: 'error', text1: 'Speech service unavailable. Check your connection.' });
      return;
    }
    setIsRecording(false);
    Toast.show({ type: 'error', text1: 'Voice recognition failed. Please try again.' });
  });

  // Cleanup on unmount (mirror: recognition.abort() in useEffect cleanup)
  useEffect(() => {
    return () => {
      try { ExpoSpeechRecognitionModule?.abort?.(); } catch { /* ignore */ }
    };
  }, []);

  useEffect(() => {
    dispatch(getSliderProducts());
  }, [dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(getSliderProducts());
    setKey((k) => k + 1);
    setRefreshing(false);
  }, [dispatch]);

  const handleImageSearch = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });
      if (result.canceled || !result.assets?.[0]) return;

      setIsImageSearching(true);
      const formData = new FormData();
      formData.append('image', {
        uri: result.assets[0].uri,
        type: 'image/jpeg',
        name: 'search-image.jpg',
      } as any);

      const { data } = await imageSearchApi(formData);
      const query = data.query || data.keywords?.join(' ') || '';
      if (query) {
        router.push({ pathname: '/products', params: { keyword: query } });
      } else {
        Toast.show({ type: 'info', text1: 'No matches found. Try another image.' });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Image search failed' });
    } finally {
      setIsImageSearching(false);
    }
  }, [router]);

  // Mirror: startRecording() from web — starts or stops voice recognition
  const startVoiceRecognition = useCallback(({ isRetry = false } = {}) => {

    stopRequestedRef.current = false;
    if (!isRetry) noSpeechRetryRef.current = 0;
    lastFinalTranscriptRef.current = '';
    setLiveTranscript('');

    if (!hasSpeechModule) {
      Toast.show({ type: 'error', text1: 'Voice search needs a dev build (not Expo Go).' });
      return;
    }

    (async () => {
      try {
        const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!permission.granted) {
          Toast.show({ type: 'error', text1: 'Microphone permission denied.' });
          return;
        }

        ExpoSpeechRecognitionModule.start({
          lang: 'en-US',
          interimResults: true,   // live interim results like web
          maxAlternatives: 1,
          continuous: false,
        });
      } catch {
        Toast.show({ type: 'error', text1: 'Could not start voice recognition.' });
      }
    })();
  }, [hasSpeechModule]);

  const handleVoiceSearch = useCallback(async () => {
    if (!hasSpeechModule) {
      Toast.show({ type: 'error', text1: 'Voice search needs a dev build (not Expo Go).' });
      return;
    }

    if (isRecording) {
      // Mirror: stopRecording()
      stopRequestedRef.current = true;

      ExpoSpeechRecognitionModule.stop();
      return;
    }
    startVoiceRecognition();
  }, [hasSpeechModule, isRecording, startVoiceRecognition]);

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#875c43" />}
      >
        {/* Header: logo + search bar */}
        <View className="flex-row items-center px-4 pt-2 pb-1 gap-2">
          {/* s */}
          <SearchBar
            editable={false}
            onPress={() => router.push('/products')}
            onImageSearch={handleImageSearch}
            onVoiceSearch={handleVoiceSearch}
            isImageSearching={isImageSearching}
            isVoiceActive={isRecording}
            liveTranscript={liveTranscript}
            containerClassName="flex-1 mb-0"
          />
        </View>

        {/* 1. Hero Banner - self-fetching */}
        <HeroBannerApi key={`banner-${key}`} />

        {/* 2. Flash Deals - self-fetching */}
        <FlashDealSection key={`flash-${key}`} />

        {/* 3. Deal Slider: Discounts for You */}
        <DealSliderSection title="Discounts for You" />

        {/* 4. Product Slider: Suggested for You (uses sliderProducts from Redux) */}
        <ProductSliderSection title="Suggested for You" products={sliderProducts} />

        {/* 5. Home Highlight Banner - self-fetching */}
        <HomeHighlightBanner key={`highlight-${key}`} />

        {/* 6. Deal Slider: Top Brands */}
        <DealSliderSection title="Top Brands, Best Price" />

        {/* 7. Product Slider: You May Also Like */}
        <ProductSliderSection title="You May Also Like..." tagline="Based on Your Interest" products={sliderProducts} />

        {/* 8. Deal of the Day - self-fetching */}
        <DealOfDaySection key={`dotd-${key}`} />

        {/* 9. New Arrivals - self-fetching */}
        <NewInSection key={`newin-${key}`} />

        {/* 10. Top Rated - self-fetching */}
        <TopRatedSection key={`toprated-${key}`} />

        {/* 11. Best Sellers - self-fetching */}
        <BestSellerSection key={`bestseller-${key}`} />

        {/* 12. Deal Slider: Top Offers */}
        <DealSliderSection title="Top Offers On" />

        {/* 13. Product Slider: Don't Miss These */}
        <ProductSliderSection title="Don't Miss These!" tagline="Inspired by your order" products={sliderProducts} />

        {/* 14. Makeup Promo Banner - self-fetching */}
        <PromoBannerSection key={`makeup-promo-${key}`} fetchApi={getMakeupPromoBannerApi} label="Makeup" />

        {/* 15. Makeup Collection (filters from sliderProducts) */}
        <CategoryCollectionSection category="MAKEUP" title="Make-up Collection" />

        {/* 16. Perfume Promo Banner - self-fetching */}
        <PromoBannerSection key={`perfume-promo-${key}`} fetchApi={getPerfumePromoBannerApi} label="Perfume" />

        {/* 17. Perfume Collection */}
        <CategoryCollectionSection category="FRAGRANCES" title="Perfume Collection" />

        {/* 18. Skincare Promo Banner - self-fetching */}
        <PromoBannerSection key={`skincare-promo-${key}`} fetchApi={getSkincarePromoBannerApi} label="Skincare" />

        {/* 19. Skincare Collection */}
        <CategoryCollectionSection category="SKIN CARE" title="Skin Care Collection" />

        {/* 20. Recently Viewed */}
        <RecentlyViewedSection />

        {/* 21. AI-Powered Services */}
        <AiServicesSection />

        {/* 22. Achievements */}
        <AchievementsCarousel />

        {/* 23. Virtual Try On */}
        <VirtualTryOnTeaser />

        {/* 24. Newsletter */}
        <NewsletterSection />

        {/* 25. Footer */}
        <FooterSection />
      </ScrollView>
    </SafeAreaView>
  );
}

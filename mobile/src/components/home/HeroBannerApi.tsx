import React, { useEffect, useRef, useState } from 'react';
import { View, FlatList, Pressable, Dimensions, Linking } from 'react-native';
import { Image } from 'expo-image';
import { getHeroBannersApi } from '../../api/endpoints/banners';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_MARGIN = 12;
const BANNER_WIDTH = SCREEN_WIDTH - BANNER_MARGIN * 2;

const fallbackBanners = [
  'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80',
  'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&q=80',
  'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80',
];

export default function HeroBannerApi() {
  const [banners, setBanners] = useState(
    fallbackBanners.map((url) => ({ image: url, link: '' }))
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        console.log('[HeroBanner] Fetching /api/v1/home/hero-banners');
        const { data } = await getHeroBannersApi();
        console.log('[HeroBanner] Response:', JSON.stringify(data).slice(0, 200));
        const items = data?.banners || [];
        if (!mounted || !items.length) return;
        const mapped = items
          .filter((b: any) => b?.image?.url)
          .map((b: any) => ({ image: b.image.url, link: b.link || '' }));
        if (mapped.length) setBanners(mapped);
      } catch (err: any) {
        console.warn('[HeroBanner] FAILED:', err?.message, err?.response?.status);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      const next = (activeIndex + 1) % banners.length;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setActiveIndex(next);
    }, 4000);
    return () => clearInterval(timer);
  }, [activeIndex, banners.length]);

  return (
    <View style={{ marginHorizontal: BANNER_MARGIN }}>
      <View style={{ overflow: 'hidden' }}>
        <FlatList
          ref={flatListRef}
          data={banners}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / BANNER_WIDTH));
          }}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                if (item.link?.startsWith('http')) Linking.openURL(item.link);
              }}
              disabled={!item.link}
            >
              <Image
                source={{ uri: item.image }}
                style={{ width: BANNER_WIDTH, aspectRatio: 3 }}
                contentFit="contain"
                transition={300}
              />
            </Pressable>
          )}
        />
      </View>
      <View className="flex-row justify-center mt-2 mb-1">
        {banners.map((_, i) => (
          <View
            key={i}
            className={`w-2 h-2 rounded-full mx-1 ${i === activeIndex ? 'bg-primary-blue' : 'bg-gray-300'}`}
          />
        ))}
      </View>
    </View>
  );
}

import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import { Image } from 'expo-image';

interface Props {
  fetchApi: () => Promise<any>;
  label?: string;
}

export default function PromoBannerSection({ fetchApi, label }: Props) {
  const [banner, setBanner] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        console.log(`[PromoBanner${label ? ':' + label : ''}] Fetching...`);
        const { data } = await fetchApi();
        console.log(`[PromoBanner${label ? ':' + label : ''}] Response:`, data?.banner ? 'has banner' : 'no banner');
        if (mounted) setBanner(data?.banner || null);
      } catch (err: any) {
        console.warn(`[PromoBanner${label ? ':' + label : ''}] FAILED:`, err?.message, err?.response?.status);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (!banner?.image?.url) return null;

  return (
    <Pressable
      onPress={() => {
        if (banner.link?.startsWith('http')) Linking.openURL(banner.link);
      }}
      disabled={!banner.link}
      className="mx-4 my-3 rounded-xl overflow-hidden"
    >
      <Image
        source={{ uri: banner.image.url }}
        style={{ width: '100%', height: 160 }}
        contentFit="cover"
        transition={300}
      />
      {banner.heading && (
        <View className="absolute inset-0 bg-black/30 justify-center items-end pr-4">
          <Text className="text-white text-lg font-brand-bold text-right">{banner.heading}</Text>
          {banner.subheading && <Text className="text-white/80 text-xs text-right mt-1">{banner.subheading}</Text>}
          {banner.ctaText && (
            <View className="mt-2 bg-white rounded-full px-4 py-1.5">
              <Text className="text-primary-darkBlue text-xs font-roboto-bold">{banner.ctaText}</Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

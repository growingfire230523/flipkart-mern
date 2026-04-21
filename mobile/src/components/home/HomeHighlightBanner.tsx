import React, { useEffect, useState } from 'react';
import { Pressable, Linking } from 'react-native';
import { Image } from 'expo-image';
import { getCommunityBannerApi } from '../../api/endpoints/banners';

export default function HomeHighlightBanner() {
  const [banner, setBanner] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        console.log('[HighlightBanner] Fetching /api/v1/home/banner');
        const { data } = await getCommunityBannerApi();
        console.log('[HighlightBanner] Response:', data?.banner ? 'has banner' : 'no banner');
        if (mounted) setBanner(data?.banner || null);
      } catch (err: any) {
        console.warn('[HighlightBanner] FAILED:', err?.message, err?.response?.status);
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
        style={{ width: '100%', height: 144 }}
        contentFit="cover"
        transition={300}
      />
    </Pressable>
  );
}

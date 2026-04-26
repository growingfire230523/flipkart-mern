import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, FlatList, Dimensions, NativeScrollEvent, NativeSyntheticEvent, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { achievements } from '../../utils/constants';
import SectionHeader from '../ui/SectionHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.75;
const CARD_GAP = 12;

export default function AchievementsCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<(typeof achievements)[number]>>(null);
  const activeIndexRef = useRef(0);

  const safeLength = useMemo(() => achievements.length || 1, []);

  const scrollToIndex = useCallback((index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    activeIndexRef.current = index;
    setActiveIndex(index);
  }, []);

  useEffect(() => {
    if (!achievements.length) return;

    const timer = setInterval(() => {
      const next = (activeIndexRef.current + 1) % safeLength;
      scrollToIndex(next);
    }, 4000);

    return () => clearInterval(timer);
  }, [safeLength, scrollToIndex]);

  const handleScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_GAP));
    activeIndexRef.current = next;
    setActiveIndex(next);
  }, []);

  const handleScrollToIndexFailed = useCallback(({ index }: { index: number }) => {
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: index * (CARD_WIDTH + CARD_GAP), animated: true });
    }, 60);
  }, []);

  const renderItem = useCallback(({ item }: { item: (typeof achievements)[number] }) => (
    <View style={styles.card}>
      <View style={styles.imageWrap}>
        <Image source={{ uri: item.imageUrl }} style={styles.image} contentFit="cover" />
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.label}</Text>
        </View>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
      </View>
    </View>
  ), []);

  return (
    <View style={styles.section}>
      <SectionHeader title="Our Achievements" />
      <Text style={styles.subtitle}>
        Trust, innovation, and customer love that power the Milaari experience
      </Text>
      <FlatList
        ref={flatListRef}
        data={achievements}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_GAP}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 16 }}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollToIndexFailed={handleScrollToIndexFailed}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
      />
      <View style={styles.dotsRow}>
        {achievements.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotInactive]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 8,
  },
  subtitle: {
    marginTop: -8,
    marginBottom: 12,
    paddingHorizontal: 16,
    color: '#6b7280',
    fontSize: 12,
    fontFamily: 'Roboto-Regular',
  },
  card: {
    width: CARD_WIDTH,
    marginRight: CARD_GAP,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  imageWrap: {
    position: 'relative',
  },
  image: {
    width: CARD_WIDTH,
    height: 120,
  },
  badge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#2b4c7e',
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontFamily: 'Roboto-Bold',
  },
  content: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  title: {
    color: '#1f2937',
    fontSize: 14,
    fontFamily: 'Roboto-Bold',
  },
  description: {
    marginTop: 4,
    color: '#6b7280',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Roboto-Regular',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: '#2b4c7e',
  },
  dotInactive: {
    backgroundColor: '#d1d5db',
  },
});

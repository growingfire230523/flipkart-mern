import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import SectionHeader from '../ui/SectionHeader';

type ServiceItem = {
  id: string;
  title: string;
  subtitle: string;
  route: string;
  image: any;
};

const services: ServiceItem[] = [
  {
    id: 'lexi-chat',
    title: 'LEXI: AI Shopping Assistant',
    subtitle: 'Chat with your personal beauty AI',
    route: '/lexi-chat',
    image: require('../../../assets/images/services/LEXI_AI_Chat_service.png'),
  },
  {
    id: 'lexi-recommendations',
    title: 'LEXI Personalized Picks',
    subtitle: 'AI-powered skin analysis & recommendations',
    route: '/lexi-recommendations',
    image: require('../../../assets/images/services/LEXI_AI_Recommendation_service.png'),
  },
  {
    id: 'fragrance-finder',
    title: 'LEXI Find My Fragrance',
    subtitle: 'Discover your perfect scent match',
    route: '/fragrance-finder',
    image: require('../../../assets/images/services/LEXI_AI_FindMyFragrance_service.png'),
  },
  {
    id: 'make-my-kit',
    title: 'LEXI Make My Kit',
    subtitle: 'Build a personalized product kit',
    route: '/make-my-kit',
    image: require('../../../assets/images/services/LEXI_AI_MakeMyKit_service.png'),
  },
];

export default function AiServicesSection() {
  const router = useRouter();

  const renderCard = useCallback((svc: ServiceItem, index: number) => {
    const isLeftColumn = index % 2 === 0;

    return (
      <Pressable
        key={svc.id}
        onPress={() => router.push(svc.route as any)}
        style={[styles.card, isLeftColumn ? styles.leftCard : styles.rightCard]}
      >
        <Image source={svc.image} style={styles.cardImage} contentFit="cover" />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>{svc.title}</Text>
          <Text style={styles.cardSubtitle} numberOfLines={2}>{svc.subtitle}</Text>
        </View>
      </Pressable>
    );
  }, [router]);

  return (
    <View style={styles.section}>
      <SectionHeader title="AI-Powered Services" />
      <View style={styles.grid}>
        {services.map((svc, index) => renderCard(svc, index))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
  },
  card: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  leftCard: {
    marginRight: '4%',
  },
  rightCard: {
    marginRight: 0,
  },
  cardImage: {
    width: '100%',
    height: 112,
  },
  cardContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cardTitle: {
    fontFamily: 'Roboto-Bold',
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#1f2937',
  },
  cardSubtitle: {
    marginTop: 3,
    fontFamily: 'Roboto-Regular',
    fontSize: 10,
    lineHeight: 14,
    color: '#6b7280',
  },
});

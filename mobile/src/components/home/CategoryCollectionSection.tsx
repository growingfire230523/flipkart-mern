import React from 'react';
import { View, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import ProductCard from '../ui/ProductCard';
import SectionHeader from '../ui/SectionHeader';

interface Props {
  category: string;
  title: string;
}

export default function CategoryCollectionSection({ category, title }: Props) {
  const { sliderProducts } = useSelector((state: RootState) => state.products);
  const router = useRouter();

  const filtered = sliderProducts?.filter((p: any) =>
    p.category?.toUpperCase() === category.toUpperCase()
  ).slice(0, 12) || [];

  if (!filtered.length) return null;

  return (
    <View>
      <SectionHeader
        title={title}
        onSeeAll={() => router.push({ pathname: '/products', params: { category } })}
      />
      <FlatList
        data={filtered}
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

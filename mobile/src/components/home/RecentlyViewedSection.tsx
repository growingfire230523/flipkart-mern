import React, { useEffect, useState } from 'react';
import { View, FlatList } from 'react-native';
import { loadRecentlyViewedItems, getActiveUserId } from '../../utils/cartStorage';
import ProductCard from '../ui/ProductCard';
import SectionHeader from '../ui/SectionHeader';

export default function RecentlyViewedSection() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const userId = await getActiveUserId();
      const viewed = await loadRecentlyViewedItems(userId);
      setItems(Array.isArray(viewed) ? viewed.reverse().slice(0, 10) : []);
    })();
  }, []);

  if (!items.length) return null;

  return (
    <View>
      <SectionHeader title="Recently Viewed" />
      <FlatList
        data={items}
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

import React, { useRef, useState } from 'react';
import { View, FlatList, Dimensions } from 'react-native';
import { Image } from 'expo-image';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  images: { url: string }[];
  height?: number;
}

const ImageCarousel: React.FC<Props> = ({ images, height = 300 }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(index);
  };

  return (
    <View>
      <FlatList
        ref={flatListRef}
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={{ width: SCREEN_WIDTH, height, backgroundColor: '#fff' }}>
            <Image
              source={{ uri: item.url }}
              style={{ width: SCREEN_WIDTH, height }}
              contentFit="contain"
              transition={200}
            />
          </View>
        )}
      />
      {images.length > 1 && (
        <View className="flex-row justify-center mt-2">
          {images.map((_, i) => (
            <View
              key={i}
              className={`w-2 h-2 rounded-full mx-1 ${
                i === activeIndex ? 'bg-primary-blue' : 'bg-gray-300'
              }`}
            />
          ))}
        </View>
      )}
    </View>
  );
};

export default ImageCarousel;

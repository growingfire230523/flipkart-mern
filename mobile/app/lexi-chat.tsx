import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { View, Text, TextInput, FlatList, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendChatMessageApi } from '../src/api/endpoints/chat';
import { addToCart } from '../src/store/slices/cartSlice';
import { addToWishlist, removeFromWishlist } from '../src/store/slices/wishlistSlice';
import { AppDispatch, RootState } from '../src/store';
import { getDiscount } from '../src/utils/functions';
import Toast from 'react-native-toast-message';
import Svg, { Path } from 'react-native-svg';

// --lexy-maroon-75 = rgba(135,92,67,0.75) i.e. primary-blue at 75%
const ACCENT = 'rgba(135,92,67,0.75)';
const ACCENT_SOLID = '#875c43';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  products?: any[];
}

const initialMessage: Message = {
  id: '0',
  text: "Hi! I'm Milaari AI. Tell me what you want to buy (category, brand, budget).",
  sender: 'assistant',
};

const extractBudget = (text: string): number | null => {
  const m = text.match(/(?:₹|Rs\.?|INR)\s*([\d,]+)/i) || text.match(/(\d{4,})/);
  return m ? parseInt(m[1].replace(/,/g, ''), 10) : null;
};

const detectIntent = (text: string): string | null => {
  const keywords = ['lipstick', 'foundation', 'serum', 'perfume', 'moisturizer', 'sunscreen', 'shampoo', 'mascara', 'eyeliner'];
  const lower = text.toLowerCase();
  return keywords.find((k) => lower.includes(k)) || null;
};

export default function MilaariChatScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { wishlistItems } = useSelector((state: RootState) => state.wishlist);
  const { user, isAuthenticated } = useSelector((state: RootState) => state.user);

  const chatOwnerId = isAuthenticated && user?._id ? String(user._id) : 'guest';
  const chatStorageKey = useMemo(() => `lexyChat:${chatOwnerId}`, [chatOwnerId]);
  const memoryStorageKey = useMemo(() => `lexyChatMemory:${chatOwnerId}`, [chatOwnerId]);

  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [memory, setMemory] = useState<any>({});
  const flatListRef = useRef<FlatList>(null);

  // Load persisted chat + memory
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(chatStorageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length) {
            setMessages([initialMessage, ...parsed]);
          }
        }
      } catch { /* ignore */ }
      try {
        const rawMem = await AsyncStorage.getItem(memoryStorageKey);
        if (rawMem) setMemory(JSON.parse(rawMem) || {});
      } catch { /* ignore */ }
    })();
  }, [chatStorageKey, memoryStorageKey]);

  // Persist messages (skip initial greeting, keep last 30)
  useEffect(() => {
    if (messages.length <= 1) return;
    const toSave = messages.slice(1).slice(-30).map((m) => ({
      id: m.id, text: m.text, sender: m.sender, products: m.products,
    }));
    AsyncStorage.setItem(chatStorageKey, JSON.stringify(toSave)).catch(() => {});
  }, [messages, chatStorageKey]);

  // Persist memory
  useEffect(() => {
    AsyncStorage.setItem(memoryStorageKey, JSON.stringify(memory || {})).catch(() => {});
  }, [memory, memoryStorageKey]);

  const handleSend = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    const budget = extractBudget(text);
    const intent = detectIntent(text);
    const newMemory = { ...memory };
    if (budget) newMemory.budget = budget;
    if (intent) newMemory.intent = intent;
    newMemory.updatedAt = Date.now();
    setMemory(newMemory);

    const userMsg: Message = { id: Date.now().toString(), text, sender: 'user' };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.sender === 'user' || m.sender === 'assistant')
        .map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }))
        .slice(-10);
      const { data } = await sendChatMessageApi(text, history, newMemory);
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: data.reply || data.message || "I'm not sure how to help with that. Could you rephrase?",
        sender: 'assistant',
        products: data.products,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), text: 'Sorry, something went wrong. Please try again.', sender: 'assistant' },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, memory]);

  const handleQuickAdd = (p: any) => {
    dispatch(addToCart({
      cartItemId: `${p._id}:::`,
      product: p._id,
      name: p.name,
      seller: p.brand?.name || '',
      price: p.price,
      cuttedPrice: p.cuttedPrice,
      image: p.image,
      stock: p.stock || 10,
      quantity: 1,
      volume: '', size: '', colorName: '', colorHex: '',
    }));
    Toast.show({ type: 'success', text1: 'Added to Cart' });
  };

  const handleWishlistToggle = (p: any) => {
    const isWishlisted = wishlistItems.some((i) => i.product === p._id);
    if (isWishlisted) {
      dispatch(removeFromWishlist(p._id));
    } else {
      dispatch(addToWishlist({
        product: p._id, name: p.name, price: p.price,
        cuttedPrice: p.cuttedPrice, image: p.image,
        ratings: p.ratings, reviews: p.numOfReviews,
      }));
    }
  };

  const renderProductCard = (p: any) => {
    const isWishlisted = wishlistItems.some((i) => i.product === p._id);
    const discount = p.cuttedPrice > p.price ? Number(getDiscount(p.price, p.cuttedPrice)) : 0;

    return (
      <Pressable
        key={p._id}
        onPress={() => router.push(`/product/${p._id}`)}
        className="bg-white rounded-xl mr-2 overflow-hidden border border-gray-200"
        style={{ width: 152 }}
      >
        <View>
          <Image
            source={{ uri: p.image }}
            style={{ width: 152, height: 120 }}
            contentFit="cover"
            transition={200}
          />
          <Pressable
            onPress={() => handleWishlistToggle(p)}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 items-center justify-center"
          >
            <Svg width={14} height={14} viewBox="0 0 24 24" fill={isWishlisted ? ACCENT_SOLID : 'none'} stroke={isWishlisted ? ACCENT_SOLID : '#7b6f6a'} strokeWidth={2}>
              <Path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </Svg>
          </Pressable>
          {discount > 0 && (
            <View className="absolute top-2 left-2 bg-red-500 rounded-md px-1.5 py-0.5">
              <Text className="text-white text-[9px] font-roboto-bold">{discount}% OFF</Text>
            </View>
          )}
        </View>
        <View className="p-2">
          <Text className="text-[11px] font-roboto-medium text-primary-darkBlue leading-snug" numberOfLines={2}>{p.name}</Text>
          <View className="flex-row items-center mt-1">
            <Text className="text-xs font-roboto-bold text-primary-darkBlue">₹{p.price?.toLocaleString()}</Text>
            {p.cuttedPrice > p.price && (
              <Text className="text-[10px] text-gray-400 line-through ml-1">₹{p.cuttedPrice?.toLocaleString()}</Text>
            )}
          </View>
          <Pressable
            onPress={() => handleQuickAdd(p)}
            className="border border-primary-darkBlue/30 rounded-sm py-1.5 mt-1.5 items-center"
          >
            <Text className="text-[10px] font-roboto-bold text-primary-darkBlue uppercase tracking-wider">Add to Bag</Text>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View className={`mb-3 px-3 ${item.sender === 'user' ? 'items-end' : 'items-start'}`}>
      <View
        className={`max-w-[85%] px-3 py-2 rounded-lg ${
          item.sender === 'user'
            ? 'rounded-br-sm'
            : 'bg-white border border-gray-200 rounded-bl-sm'
        }`}
        style={item.sender === 'user' ? { backgroundColor: ACCENT } : undefined}
      >
        <Text className={`text-sm leading-5 ${item.sender === 'user' ? 'text-white' : 'text-gray-800'}`}>
          {item.text}
        </Text>
      </View>
      {item.products?.length ? (
        <FlatList
          data={item.products}
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-2"
          keyExtractor={(p) => p._id}
          renderItem={({ item: p }) => renderProductCard(p)}
        />
      ) : null}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3" style={{ backgroundColor: ACCENT }}>
        <Pressable onPress={() => router.back()} className="mr-3">
          <Text className="text-lg text-white">←</Text>
        </Pressable>
        <View className="flex-1">
          <Text className="text-base font-roboto-bold text-white">Milaari AI</Text>
          <Text className="text-xs text-white/70">Your personal beauty assistant</Text>
        </View>
        {user?.name && (
          <View className="bg-white/20 rounded-full px-3 py-1">
            <Text className="text-xs text-white font-roboto-medium">{user.name.split(' ')[0]}</Text>
          </View>
        )}
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 12 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Typing indicator */}
      {loading && (
        <View className="px-3 mb-2 items-start">
          <View className="bg-white border border-gray-200 rounded-lg rounded-bl-sm px-3 py-2">
            <Text className="text-sm text-gray-400">Milaari is typing...</Text>
          </View>
        </View>
      )}

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View className="p-3 bg-white border-t border-gray-200" style={{ paddingBottom: 34 }}>
          <View className="flex-row items-end">
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Tell me what you're looking for..."
              placeholderTextColor="#9ca3af"
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm font-roboto text-gray-800 mr-2 max-h-28"
              multiline
              maxLength={500}
            />
            <Pressable
              onPress={() => void handleSend()}
              disabled={loading || !input.trim()}
              className="px-4 py-2 rounded items-center justify-center"
              style={{
                backgroundColor: loading || !input.trim() ? '#d1d5db' : ACCENT_SOLID,
              }}
            >
              <Text className="text-white text-sm font-roboto-bold">Send</Text>
            </Pressable>
          </View>
          <Text className="text-[10px] text-gray-400 mt-1.5 text-center">
            Milaari can recommend products based on your preferences, budget & skin type
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

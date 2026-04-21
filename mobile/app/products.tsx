import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Keyboard,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProductCard from '../src/components/ui/ProductCard';
import SearchBar from '../src/components/ui/SearchBar';
import CategoryPill from '../src/components/ui/CategoryPill';
import EmptyState from '../src/components/ui/EmptyState';
import SkeletonLoader from '../src/components/ui/SkeletonLoader';
import FilterSheet from '../src/components/ui/FilterSheet';
import type { FilterValues } from '../src/components/ui/FilterSheet';
import { useDebounce } from '../src/hooks/useDebounce';
import { categories } from '../src/utils/constants';
import { getProductsApi, getSuggestProductsApi } from '../src/api/endpoints/products';
import { imageSearchApi } from '../src/api/endpoints/imageSearch';
import Toast from 'react-native-toast-message';
import Svg, { Path } from 'react-native-svg';

let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEventSafe: (eventName: string, listener: (event: any) => void) => void = () => {};

try {
  const speech = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = speech.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEventSafe = speech.useSpeechRecognitionEvent;
} catch {
  // expo-speech-recognition is unavailable in Expo Go.
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 32 - 8) / 2;
const RECENT_SEARCHES_KEY = 'lexy_recent_searches';

type SuggestionItem = {
  keyword: string;
  category?: string;
};

type TrendingItem = {
  keyword: string;
};

function paramStr(v: string | string[] | undefined): string {
  if (v == null) return '';
  return Array.isArray(v) ? String(v[0] ?? '') : String(v);
}

function ProductSkeleton() {
  return (
    <View style={{ width: CARD_WIDTH, marginBottom: 8 }}>
      <View className="bg-white rounded-xl overflow-hidden shadow-sm">
        <SkeletonLoader width={CARD_WIDTH} height={CARD_WIDTH} borderRadius={0} />
        <View style={{ padding: 8 }}>
          <SkeletonLoader width={60} height={10} style={{ marginBottom: 4 }} />
          <SkeletonLoader width={CARD_WIDTH - 16} height={14} style={{ marginBottom: 4 }} />
          <SkeletonLoader width={80} height={12} style={{ marginBottom: 4 }} />
          <SkeletonLoader width={100} height={16} />
        </View>
      </View>
    </View>
  );
}

export default function ProductsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ keyword?: string | string[]; category?: string | string[]; subCategory?: string | string[] }>();

  const routeKeyword = useMemo(() => paramStr(params.keyword), [params.keyword]);
  const routeCategory = useMemo(() => paramStr(params.category), [params.category]);
  const routeSubCategory = useMemo(() => paramStr(params.subCategory), [params.subCategory]);

  const [keyword, setKeyword] = useState(routeKeyword);
  const [category, setCategory] = useState(routeCategory);
  const [subCategory, setSubCategory] = useState(routeSubCategory);
  const [currentPage, setCurrentPage] = useState(1);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<FilterValues>({
    priceMin: '0',
    priceMax: '200000',
    ratingsGte: '0',
    sort: '',
  });
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [didYouMean, setDidYouMean] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isImageSearching, setIsImageSearching] = useState(false);

  const fetchId = useRef(0);
  const suggestionAbortRef = useRef<AbortController | null>(null);
  const trendingFetchedRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const noSpeechRetryRef = useRef(0);
  const lastFinalTranscriptRef = useRef('');
  const micPermissionGrantedRef = useRef(false);

  const hasSpeechModule = !!ExpoSpeechRecognitionModule?.start;
  const isBusy = isRecording || isImageSearching;

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed.filter((v) => typeof v === 'string' && v.trim()).slice(0, 10));
        }
      } catch {
        // ignore parse errors
      }
    })();
  }, []);

  const saveRecentSearch = useCallback(async (term: string) => {
    const trimmed = String(term || '').trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const existing = prev.filter((t) => t.toLowerCase() !== trimmed.toLowerCase());
      const next = [trimmed, ...existing].slice(0, 10);
      AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const removeRecentSearch = useCallback((termToRemove: string) => {
    setRecentSearches((prev) => {
      const next = prev.filter((t) => t !== termToRemove);
      AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  // Keep local search + filters in sync when navigation params change (e.g. image search → products)
  useEffect(() => {
    setKeyword(routeKeyword);
    setCategory(routeCategory);
    setSubCategory(routeSubCategory);
    setCurrentPage(1);
  }, [routeKeyword, routeCategory, routeSubCategory]);

  const performSearch = useCallback(
    (value: string) => {
      const trimmed = String(value || '').trim();
      setKeyword(trimmed);
      setCurrentPage(1);
      setShowSuggestions(false);
      Keyboard.dismiss();

      if (trimmed) {
        saveRecentSearch(trimmed);
        router.setParams({ keyword: trimmed } as any);
      } else {
        router.setParams({ keyword: undefined } as any);
      }
    },
    [router, saveRecentSearch]
  );

  const debouncedKeyword = useDebounce(keyword, 450);

  const fetchTrending = useCallback(async () => {
    if (trendingFetchedRef.current) return;
    trendingFetchedRef.current = true;
    try {
      const { data } = await getSuggestProductsApi('');
      if (Array.isArray(data?.trending)) {
        const normalized = data.trending
          .map((t: any) => ({ keyword: String(t?.keyword || '').trim() }))
          .filter((t: TrendingItem) => !!t.keyword);
        setTrending(normalized);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const trimmed = String(keyword || '').trim();

    if (!trimmed) {
      suggestionAbortRef.current?.abort?.();
      setSuggestions([]);
      setDidYouMean(null);
      setIsLoadingSuggestions(false);
      return;
    }

    if (trimmed.length < 2) {
      suggestionAbortRef.current?.abort?.();
      setSuggestions([]);
      setDidYouMean(null);
      setIsLoadingSuggestions(false);
      return;
    }

    const controller = new AbortController();
    suggestionAbortRef.current?.abort?.();
    suggestionAbortRef.current = controller;

    setIsLoadingSuggestions(true);

    const timeoutId = setTimeout(async () => {
      try {
        const { data } = await getSuggestProductsApi(trimmed);
        if (controller.signal.aborted) return;

        const rawSuggestions = Array.isArray(data?.suggestions) ? data.suggestions : [];
        const normalized: SuggestionItem[] = rawSuggestions
          .map((s: any) => {
            if (typeof s === 'string') return { keyword: s };
            return {
              keyword: String(s?.keyword || '').trim(),
              category: s?.category ? String(s.category) : undefined,
            };
          })
          .filter((s: SuggestionItem) => !!s.keyword);

        setSuggestions(normalized);
        setDidYouMean(data?.didYouMean ? String(data.didYouMean) : null);
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
          setDidYouMean(null);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoadingSuggestions(false);
      }
    }, 220);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [keyword]);

  const fetchProducts = useCallback(
    async (page: number, append: boolean) => {
      const id = ++fetchId.current;
      setLoading(true);
      try {
        const queryParams: Record<string, string> = {
          keyword: debouncedKeyword.trim(),
          'price[gte]': filters.priceMin || '0',
          'price[lte]': filters.priceMax || '200000',
          'ratings[gte]': filters.ratingsGte || '0',
          page: String(page),
        };
        if (category) queryParams.category = category;
        if (subCategory) queryParams.subCategory = subCategory;
        if (filters.sort) {
          const sortMap: Record<string, string> = {
            price_asc: 'price',
            price_desc: '-price',
            ratings_desc: '-ratings',
            newest: '-createdAt',
          };
          if (sortMap[filters.sort]) queryParams.sort = sortMap[filters.sort];
        }
        const { data } = await getProductsApi(queryParams);
        if (id !== fetchId.current) return;
        const prods = data?.products || [];
        setTotalCount(Number(data?.filteredProductsCount ?? prods.length) || 0);
        if (append) setAllProducts((prev) => [...prev, ...prods]);
        else setAllProducts(prods);
      } catch (err: unknown) {
        const msg = err && typeof err === 'object' && 'message' in err ? String((err as Error).message) : '';
        console.warn('[Products] FAILED:', msg);
        if (id !== fetchId.current) return;
        if (!append) setAllProducts([]);
      } finally {
        if (id === fetchId.current) setLoading(false);
      }
    },
    [debouncedKeyword, category, subCategory, filters]
  );

  useEffect(() => {
    setCurrentPage(1);
    fetchProducts(1, false);
  }, [fetchProducts]);

  const handleLoadMore = () => {
    if (!loading && allProducts.length > 0 && allProducts.length < totalCount) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchProducts(nextPage, true);
    }
  };

  const showSkeletons = loading && allProducts.length === 0;

  const isShop99Active = filters.priceMin === '0' && filters.priceMax === '99';

  const setCategoryPill = (cat: string) => {
    setCategory(cat);
    if (cat !== routeCategory) setSubCategory('');
    Keyboard.dismiss();
    setShowSuggestions(false);

    // If "Shop 0-99" is currently selected, deselect it when any category pill is tapped.
    if (filters.priceMin === '0' && filters.priceMax === '99') {
      setFilters((prev) => ({
        ...prev,
        priceMin: '0',
        priceMax: '200000',
      }));
    }
  };

  const runImageSearch = useCallback(async () => {
    if (isBusy) return;

    try {
      setIsImageSearching(true);
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
      if (result.canceled || !result.assets?.[0]) return;

      const formData = new FormData();
      formData.append('image', {
        uri: result.assets[0].uri,
        type: 'image/jpeg',
        name: 'search-image.jpg',
      } as any);

      const { data } = await imageSearchApi(formData);
      const query = String(data?.query || data?.keywords?.join(' ') || '').trim();
      if (!query) {
        Toast.show({ type: 'info', text1: 'Could not extract a keyword from image.' });
        return;
      }

      performSearch(query);
    } catch (err: any) {
      const msg = String(err?.response?.data?.message || err?.message || '').toLowerCase();
      if (msg.includes('failed to fetch') || msg.includes('network')) {
        Toast.show({ type: 'error', text1: 'Cannot reach server for image search.' });
      } else {
        Toast.show({ type: 'error', text1: 'Image search failed. Please try again.' });
      }
    } finally {
      setIsImageSearching(false);
    }
  }, [isBusy, performSearch]);

  const startVoiceRecognition = useCallback(async ({ isRetry = false } = {}) => {
    if (isImageSearching || isRecording) return;

    stopRequestedRef.current = false;
    if (!isRetry) noSpeechRetryRef.current = 0;
    lastFinalTranscriptRef.current = '';

    if (!hasSpeechModule) {
      Toast.show({ type: 'error', text1: 'Voice search needs a dev build (not Expo Go).' });
      return;
    }

    try {
      if (!micPermissionGrantedRef.current) {
        const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!permission?.granted) {
          Toast.show({ type: 'error', text1: 'Microphone permission denied.' });
          return;
        }
        micPermissionGrantedRef.current = true;
      }

      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        maxAlternatives: 1,
        continuous: false,
      });
    } catch {
      Toast.show({ type: 'error', text1: 'Could not start voice recognition.' });
    }
  }, [hasSpeechModule, isImageSearching, isRecording]);

  const stopVoiceRecognition = useCallback(async () => {
    stopRequestedRef.current = true;

    if (!hasSpeechModule) {
      Toast.show({ type: 'error', text1: 'Voice search needs a dev build (not Expo Go).' });
      setIsRecording(false);
      return;
    }

    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      setIsRecording(false);
    }
  }, [hasSpeechModule]);

  // Web-equivalent speech events
  useSpeechRecognitionEventSafe('start', () => {
    setIsRecording(true);
  });

  useSpeechRecognitionEventSafe('result', (event) => {
    try {
      const transcript = String(event?.results?.[0]?.transcript || '').trim();
      if (!transcript) return;

      if (event?.isFinal) {
        lastFinalTranscriptRef.current = transcript;
      }
      setKeyword(transcript);
      setShowSuggestions(false);
    } catch {
      // ignore
    }
  });

  useSpeechRecognitionEventSafe('error', (event) => {
    const err = String(event?.error || '').toLowerCase();

    if (err === 'aborted') {
      setIsRecording(false);
      return;
    }

    if (err === 'no-speech') {
      if (!stopRequestedRef.current && noSpeechRetryRef.current < 1) {
        noSpeechRetryRef.current += 1;
        setIsRecording(false);
        setTimeout(() => {
          if (stopRequestedRef.current) return;
          void startVoiceRecognition({ isRetry: true });
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
      Toast.show({ type: 'error', text1: 'No microphone was found.' });
      return;
    }

    if (err === 'network') {
      setIsRecording(false);
      Toast.show({ type: 'error', text1: 'Speech service unavailable. Check connection.' });
      return;
    }

    setIsRecording(false);
    Toast.show({ type: 'error', text1: 'Voice recognition failed. Please try again.' });
  });

  useSpeechRecognitionEventSafe('end', () => {
    setIsRecording(false);
    const text = String(lastFinalTranscriptRef.current || '').trim();
    lastFinalTranscriptRef.current = '';
    if (text) {
      performSearch(text);
    }
  });

  useEffect(() => {
    return () => {
      try {
        ExpoSpeechRecognitionModule?.abort?.();
      } catch {
        // ignore
      }
    };
  }, []);

  const header = (
    <>
      <View className="flex-row items-center px-2 pt-2 pb-1">
        <Pressable
          onPress={() => {
            Keyboard.dismiss();
            router.back();
          }}
          className="px-2 py-2"
        >
          <Text className="text-lg text-primary-grey">←</Text>
        </Pressable>
        <View className="flex-1">
          <SearchBar
            value={keyword}
            containerClassName="mx-0 mb-0"
            onChangeText={(t) => {
              setKeyword(t);
              setShowSuggestions(true);
            }}
            onImageSearch={runImageSearch}
            onVoiceSearch={() => {
              if (isRecording) {
                void stopVoiceRecognition();
              } else {
                void startVoiceRecognition();
              }
            }}
            isVoiceActive={isRecording}
            isImageSearching={isImageSearching}
            autoFocus={!routeCategory && !routeSubCategory}
            onPress={undefined}
            onSubmitEditing={() => {
              performSearch(keyword);
            }}
            placeholder="Search mascara ..."
          />
        </View>
        <Pressable
          onPress={() => {
            Keyboard.dismiss();
            setShowFilter(true);
          }}
          className="px-2 py-2"
        >
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#7b6f6a" strokeWidth={2}>
            <Path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
      </View>

      {showSuggestions && (recentSearches.length > 0 || keyword.trim().length > 0 || trending.length > 0) && (
        <View className="mx-4 mb-2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          {!keyword.trim() ? (
            <>
              {recentSearches.length > 0 && (
                <View className="py-1">
                  <Text className="px-3 pt-2 pb-2 text-[11px] uppercase tracking-widest text-primary-grey/90">Recent searches</Text>
                  {recentSearches.map((term) => (
                    <Pressable
                      key={term}
                      onPress={() => performSearch(term)}
                      className="flex-row items-center justify-between px-3 py-2"
                    >
                      <Text className="flex-1 text-sm text-primary-darkBlue">{term}</Text>
                      <Pressable
                        onPress={() => removeRecentSearch(term)}
                        className="ml-2 w-5 h-5 items-center justify-center"
                      >
                        <Text className="text-xs text-primary-grey">x</Text>
                      </Pressable>
                    </Pressable>
                  ))}
                </View>
              )}
              {trending.length > 0 && (
                <View className={recentSearches.length > 0 ? 'py-1 border-t border-gray-100' : 'py-1'}>
                  <Text className="px-3 pt-2 pb-2 text-[11px] uppercase tracking-widest text-primary-grey/90">Trending</Text>
                  {trending.map((item) => (
                    <Pressable
                      key={item.keyword}
                      onPress={() => performSearch(item.keyword)}
                      className="px-3 py-2"
                    >
                      <Text className="text-sm text-primary-darkBlue">{item.keyword}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          ) : (
            <View className="py-1">
              {didYouMean ? (
                <View className="px-3 py-2 border-b border-gray-100 flex-row items-center">
                  <Text className="text-xs text-primary-grey">Did you mean: </Text>
                  <Pressable onPress={() => performSearch(didYouMean)}>
                    <Text className="text-xs text-primary-blue font-roboto-bold">{didYouMean}</Text>
                  </Pressable>
                  <Text className="text-xs text-primary-grey">?</Text>
                </View>
              ) : null}

              <Text className="px-3 pt-2 pb-2 text-[11px] uppercase tracking-widest text-primary-grey/90">Suggestions</Text>

              {isLoadingSuggestions ? (
                <Text className="px-3 pb-2 text-xs text-primary-grey">Searching...</Text>
              ) : suggestions.length > 0 ? (
                suggestions.slice(0, 8).map((item, i) => (
                  <Pressable
                    key={`${item.keyword}-${item.category || ''}-${i}`}
                    onPress={() => performSearch(item.keyword)}
                    className="px-3 py-2 flex-row items-center justify-between"
                  >
                    <Text className="text-sm text-primary-darkBlue flex-1 mr-2" numberOfLines={1}>{item.keyword}</Text>
                    {item.category ? (
                      <Text className="text-[10px] uppercase tracking-wider text-primary-grey bg-gray-100 px-2 py-0.5 rounded-full">
                        in {item.category}
                      </Text>
                    ) : null}
                  </Pressable>
                ))
              ) : (
                <Text className="px-3 pb-2 text-xs text-primary-grey">No suggestions found.</Text>
              )}
            </View>
          )}
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12 }}
      >
        <CategoryPill
          label="All"
          isActive={!category && !isShop99Active}
          onPress={() => setCategoryPill('')}
        />
        <CategoryPill
          label="Shop 0-99"
          isActive={filters.priceMin === '0' && filters.priceMax === '99'}
          onPress={() => {
            Keyboard.dismiss();
            setShowSuggestions(false);
            setFilters((prev) => {
              const isActiveNow = prev.priceMin === '0' && prev.priceMax === '99';
              const nextPriceMax = isActiveNow ? '200000' : '99';

              return {
                ...prev,
                priceMin: '0',
                priceMax: nextPriceMax,
              };
            });

            // When selecting "Shop 0-99", clear category selection so only one pill appears active.
            setCategory('');
            setSubCategory('');
          }}
        />
        {categories.map((cat) => (
          <CategoryPill key={cat} label={cat} isActive={category === cat} onPress={() => setCategoryPill(cat)} />
        ))}
      </ScrollView>

      {subCategory ? (
        <View className="px-4 pb-2">
          <View className="bg-primary-blue/10 rounded-lg px-3 py-2 flex-row items-center justify-between">
            <Text className="text-xs text-primary-darkBlue font-roboto-medium flex-1" numberOfLines={1}>
              Subcategory: {subCategory}
            </Text>
            <Pressable
              onPress={() => setSubCategory('')}
              className="ml-2"
            >
              <Text className="text-xs text-primary-blue font-roboto-bold">Clear</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View className="flex-row items-center px-4 mb-2">
        <Text className="text-xs text-primary-grey flex-1 font-roboto">
          {totalCount} products found
        </Text>
        {loading && allProducts.length > 0 && (
          <ActivityIndicator size="small" color="#875c43" />
        )}
      </View>
    </>
  );

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      {showSkeletons ? (
        <>
          {header}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <ProductSkeleton key={i} />
            ))}
          </View>
        </>
      ) : (
        <FlatList
          data={allProducts}
          numColumns={2}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'none'}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 40 }}
          columnWrapperStyle={{ gap: 8 }}
          ListEmptyComponent={
            <EmptyState title="No products found" subtitle="Try a different search or category" />
          }
          ListFooterComponent={
            loading && allProducts.length > 0 ? (
              <ActivityIndicator color="#875c43" style={{ paddingVertical: 16 }} />
            ) : null
          }
          onScrollBeginDrag={() => {
            setShowSuggestions(false);
            Keyboard.dismiss();
          }}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.35}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <View style={{ width: CARD_WIDTH, marginBottom: 8 }}>
              <ProductCard product={item} />
            </View>
          )}
        />
      )}

      <FilterSheet
        visible={showFilter}
        initialValues={filters}
        onApply={(v) => {
          setFilters(v);
          setShowFilter(false);
        }}
        onReset={() => {
          setFilters({ priceMin: '0', priceMax: '200000', ratingsGte: '0', sort: '' });
          setShowFilter(false);
        }}
        onClose={() => setShowFilter(false)}
      />
    </SafeAreaView>
  );
}

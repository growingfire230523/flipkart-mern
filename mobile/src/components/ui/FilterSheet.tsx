import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FilterValues {
  priceMin: string;
  priceMax: string;
  ratingsGte: string;
  sort: string;
}

interface Props {
  visible: boolean;
  initialValues: FilterValues;
  onApply: (values: FilterValues) => void;
  onReset: () => void;
  onClose: () => void;
}

const SORT_OPTIONS = [
  { label: 'Relevance', value: '' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Ratings', value: 'ratings_desc' },
  { label: 'Newest', value: 'newest' },
];

const RATING_OPTIONS = [
  { label: '4+ Stars', value: '4' },
  { label: '3+ Stars', value: '3' },
  { label: '2+ Stars', value: '2' },
  { label: '1+ Stars', value: '1' },
];

export default function FilterSheet({ visible, initialValues, onApply, onReset, onClose }: Props) {
  const [values, setValues] = useState<FilterValues>(initialValues);
  const insets = useSafeAreaInsets();

  // Sync values whenever the sheet opens so stale state is never shown
  useEffect(() => {
    if (visible) setValues(initialValues);
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' }}>
            <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-100">
              <Text className="text-lg font-roboto-bold text-primary-darkBlue">Filters</Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Text className="text-primary-grey text-2xl leading-6">×</Text>
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Price Range */}
              <Text className="text-sm font-roboto-medium text-gray-700 mt-4 mb-2">Price Range</Text>
              <View className="flex-row items-center">
                <TextInput
                  value={values.priceMin}
                  onChangeText={(t) => setValues({ ...values, priceMin: t })}
                  placeholder="Min"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-roboto"
                />
                <Text className="mx-2 text-gray-400">—</Text>
                <TextInput
                  value={values.priceMax}
                  onChangeText={(t) => setValues({ ...values, priceMax: t })}
                  placeholder="Max"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-roboto"
                />
              </View>

              {/* Ratings */}
              <Text className="text-sm font-roboto-medium text-gray-700 mt-4 mb-2">Minimum Rating</Text>
              <View className="flex-row flex-wrap">
                {RATING_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => setValues({ ...values, ratingsGte: values.ratingsGte === opt.value ? '0' : opt.value })}
                    className={`px-4 py-2 rounded-lg mr-2 mb-2 border ${
                      values.ratingsGte === opt.value ? 'border-primary-blue bg-primary-blue/10' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <Text className={`text-sm ${values.ratingsGte === opt.value ? 'text-primary-blue font-roboto-bold' : 'text-gray-700'}`}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Sort */}
              <Text className="text-sm font-roboto-medium text-gray-700 mt-4 mb-2">Sort By</Text>
              {SORT_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => setValues({ ...values, sort: opt.value })}
                  className={`flex-row items-center py-2 px-3 rounded-lg mb-1 ${
                    values.sort === opt.value ? 'bg-primary-blue/10' : ''
                  }`}
                >
                  <View className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                    values.sort === opt.value ? 'border-primary-blue' : 'border-gray-300'
                  }`}>
                    {values.sort === opt.value && <View className="w-2.5 h-2.5 rounded-full bg-primary-blue" />}
                  </View>
                  <Text className={`text-sm ${values.sort === opt.value ? 'text-primary-blue font-roboto-medium' : 'text-gray-700'}`}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View
              className="flex-row px-4 pt-3 border-t border-gray-100"
              style={{ paddingBottom: Math.max(insets.bottom, 16) }}
            >
              <Pressable
                onPress={() => {
                  onReset();
                  setValues({ priceMin: '0', priceMax: '200000', ratingsGte: '0', sort: '' });
                }}
                className="flex-1 py-3 rounded-xl items-center border border-gray-200 mr-2"
              >
                <Text className="text-gray-700 font-roboto-medium">Reset</Text>
              </Pressable>
              <Pressable
                onPress={() => onApply(values)}
                className="flex-1 py-3 rounded-xl items-center bg-primary-blue ml-2"
              >
                <Text className="text-white font-roboto-bold">Apply</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export type { FilterValues };

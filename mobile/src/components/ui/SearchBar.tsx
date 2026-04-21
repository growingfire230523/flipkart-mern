import React from 'react';
import { View, TextInput, Pressable, Text, ActivityIndicator } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface Props {
  value?: string;
  onChangeText?: (text: string) => void;
  onPress?: () => void;
  placeholder?: string;
  editable?: boolean;
  autoFocus?: boolean;
  onSubmitEditing?: () => void;
  onImageSearch?: () => void;
  onVoiceSearch?: () => void;
  isVoiceActive?: boolean;
  isImageSearching?: boolean;
  /** Live interim transcript shown while voice recording */
  liveTranscript?: string;
  /** Outer wrapper classes; default includes horizontal margin for standalone use */
  containerClassName?: string;
}

const SearchBar: React.FC<Props> = ({
  value,
  onChangeText,
  onPress,
  placeholder = 'Search for beauty products...',
  editable = true,
  autoFocus,
  onSubmitEditing,
  onImageSearch,
  onVoiceSearch,
  isVoiceActive,
  isImageSearching,
  liveTranscript,
  containerClassName = 'mx-4 mb-3',
}) => {
  const Container = onPress && !editable ? Pressable : View;

  return (
    <Container onPress={onPress} className={containerClassName}>
      <View className="flex-row items-center bg-white rounded-xl border border-gray-200 px-3 py-2.5 shadow-sm">
        {/* Search icon */}
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#7b6f6a" strokeWidth={2}>
          <Path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>

        {/* Input or placeholder */}
        {editable ? (
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#9ca3af"
            className="flex-1 ml-2 text-sm font-roboto text-gray-800"
            autoFocus={autoFocus}
            returnKeyType="search"
            onSubmitEditing={onSubmitEditing}
          />
        ) : isVoiceActive && liveTranscript ? (
          <Text className="flex-1 ml-2 text-sm text-gray-800 font-roboto" numberOfLines={1}>{liveTranscript}</Text>
        ) : isVoiceActive ? (
          <Text className="flex-1 ml-2 text-sm font-roboto" style={{ color: '#d6b36a' }}>Listening...</Text>
        ) : (
          <Text className="flex-1 ml-2 text-sm text-gray-400 font-roboto">{placeholder}</Text>
        )}

        {/* Image search icon */}
        {onImageSearch && (
          <Pressable onPress={onImageSearch} disabled={isImageSearching || isVoiceActive} className="ml-2 p-1">
            {isImageSearching ? (
              <ActivityIndicator size="small" color="#d6b36a" />
            ) : (
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#875c43" strokeWidth={1.8}>
                <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M12 17a4 4 0 100-8 4 4 0 000 8z" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            )}
          </Pressable>
        )}

        {/* Voice search icon */}
        {onVoiceSearch && (
          <Pressable onPress={onVoiceSearch} disabled={isImageSearching} className="ml-1 p-1">
            <Svg
              width={20}
              height={20}
              viewBox="0 0 24 24"
              fill="none"
              stroke={isVoiceActive ? '#d6b36a' : '#875c43'}
              strokeWidth={1.8}
            >
              <Path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" strokeLinecap="round" strokeLinejoin="round" />
              <Path d="M19 10v2a7 7 0 01-14 0v-2" strokeLinecap="round" strokeLinejoin="round" />
              <Path d="M12 19v4M8 23h8" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
        )}
      </View>
    </Container>
  );
};

export default SearchBar;

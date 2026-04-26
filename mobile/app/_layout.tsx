import '../global.css';

import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider, useDispatch } from 'react-redux';
import { store, AppDispatch } from '../src/store';
import { loadUser } from '../src/store/slices/userSlice';
import { useFonts } from 'expo-font';
import {
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_700Bold,
} from '@expo-google-fonts/roboto';
import {
  CormorantGaramond_400Regular,
  CormorantGaramond_500Medium,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_700Bold,
} from '@expo-google-fonts/cormorant-garamond';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';

function SessionBootstrap() {
  const dispatch = useDispatch<AppDispatch>();
  useEffect(() => {
    dispatch(loadUser());
  }, [dispatch]);
  return null;
}

function RootLayoutInner() {
  const [fontsLoaded, fontError] = useFonts({
    'Roboto': Roboto_400Regular,
    'Roboto-Regular': Roboto_400Regular,
    'Roboto-Medium': Roboto_500Medium,
    'Roboto-Bold': Roboto_700Bold,
    'CormorantGaramond': CormorantGaramond_400Regular,
    'CormorantGaramond-Medium': CormorantGaramond_500Medium,
    'CormorantGaramond-SemiBold': CormorantGaramond_600SemiBold,
    'CormorantGaramond-Bold': CormorantGaramond_700Bold,
  });

  if (fontError) {
    console.warn('Font loading failed; continuing without custom fonts.', fontError);
  }

  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fbf6f2' }}>
        <ActivityIndicator size="large" color="#875c43" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#fbf6f2' }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#fbf6f2' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="product/[id]" />
        <Stack.Screen name="products" />
        <Stack.Screen name="compare" />
        <Stack.Screen name="checkout" />
        <Stack.Screen name="orders/index" />
        <Stack.Screen name="orders/[id]" />
        <Stack.Screen name="account/update-profile" />
        <Stack.Screen name="account/update-password" />
        <Stack.Screen name="account/manage-addresses" />
        <Stack.Screen name="fragrance-finder" />
        <Stack.Screen name="lexi-chat" />
        <Stack.Screen name="lexi-recommendations" />
        <Stack.Screen name="community" />
        <Stack.Screen name="make-my-kit" />
        <Stack.Screen name="image-search" />
        <Stack.Screen name="admin" />
      </Stack>
      <Toast />
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <SessionBootstrap />
      <RootLayoutInner />
    </Provider>
  );
}

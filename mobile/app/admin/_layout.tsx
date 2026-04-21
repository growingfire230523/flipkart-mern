import React from 'react';
import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#24171a' },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontFamily: 'Roboto-Medium', fontSize: 17 },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: '#fbf6f2' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Admin' }} />
      <Stack.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Stack.Screen name="orders" options={{ title: 'Orders' }} />
      <Stack.Screen name="products" options={{ title: 'Products' }} />
      <Stack.Screen name="users" options={{ title: 'Users' }} />
      <Stack.Screen name="mail-list" options={{ title: 'Mail list' }} />
      <Stack.Screen name="reviews" options={{ title: 'Reviews' }} />
      <Stack.Screen name="deals" options={{ title: 'Deals' }} />
      <Stack.Screen name="banners" options={{ title: 'Banners' }} />
      <Stack.Screen name="ads" options={{ title: 'Ads & promos' }} />
      <Stack.Screen name="new-product" options={{ title: 'Add product' }} />
    </Stack>
  );
}

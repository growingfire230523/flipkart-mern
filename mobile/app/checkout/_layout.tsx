import React from 'react';
import { Stack } from 'expo-router';

export default function CheckoutLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#fbf6f2' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="shipping" />
      <Stack.Screen name="confirm" />
      <Stack.Screen name="payment" />
      <Stack.Screen name="success" />
    </Stack>
  );
}

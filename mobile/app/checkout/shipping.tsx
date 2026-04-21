import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../src/store';
import { setShippingInfo } from '../../src/store/slices/cartSlice';
import { saveShippingInfoToStorage, getActiveUserId } from '../../src/utils/cartStorage';
import states from '../../src/utils/states';
import Toast from 'react-native-toast-message';

export default function ShippingScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { shippingInfo } = useSelector((state: RootState) => state.cart);

  const [address, setAddress] = useState(shippingInfo.address || '');
  const [city, setCity] = useState(shippingInfo.city || '');
  const [state, setState] = useState(shippingInfo.state || '');
  const [country, setCountry] = useState(shippingInfo.country || 'IN');
  const [pincode, setPincode] = useState(shippingInfo.pincode || '');
  const [phoneNo, setPhoneNo] = useState(shippingInfo.phoneNo || '');

  const handleSubmit = async () => {
    if (!address || !city || !state || !pincode || !phoneNo) {
      Toast.show({ type: 'error', text1: 'Please fill all fields' });
      return;
    }
    if (phoneNo.length < 10) {
      Toast.show({ type: 'error', text1: 'Invalid phone number' });
      return;
    }
    const info = { address, city, state, country, pincode, phoneNo };
    dispatch(setShippingInfo(info));
    const userId = await getActiveUserId();
    await saveShippingInfoToStorage(userId, info);
    router.push('/checkout/confirm');
  };

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Text className="text-lg text-primary-grey">←</Text>
        </Pressable>
        <Text className="text-xl font-brand-bold text-primary-darkBlue">Shipping Address</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}>
          {[
            { label: 'Address', value: address, setter: setAddress, placeholder: 'Enter full address', multiline: true },
            { label: 'City', value: city, setter: setCity, placeholder: 'Enter city' },
            { label: 'State', value: state, setter: setState, placeholder: 'Enter state' },
            { label: 'Pincode', value: pincode, setter: setPincode, placeholder: 'Enter pincode', keyboardType: 'number-pad' as const },
            { label: 'Phone Number', value: phoneNo, setter: setPhoneNo, placeholder: 'Enter phone number', keyboardType: 'phone-pad' as const },
          ].map((field) => (
            <View key={field.label} className="mb-4">
              <Text className="text-sm font-roboto-medium text-gray-700 mb-1.5">{field.label}</Text>
              <TextInput
                value={field.value}
                onChangeText={field.setter}
                placeholder={field.placeholder}
                placeholderTextColor="#9ca3af"
                keyboardType={field.keyboardType}
                multiline={field.multiline}
                className={`bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base font-roboto text-gray-800 ${field.multiline ? 'min-h-[80px]' : ''}`}
                style={field.multiline ? { textAlignVertical: 'top' } : undefined}
              />
            </View>
          ))}

          <Pressable onPress={handleSubmit} className="bg-primary-blue py-4 rounded-xl items-center mt-4">
            <Text className="text-white font-roboto-bold text-base">Continue to Confirm</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

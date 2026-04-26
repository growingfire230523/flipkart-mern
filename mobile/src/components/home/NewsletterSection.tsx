import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { subscribeMailingListApi } from '../../api/endpoints/mailingList';
import Toast from 'react-native-toast-message';

export default function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const normalizeIndianPhone = (raw: string) => {
    const cleaned = String(raw || '').trim();
    if (!cleaned) return null;

    const digitsOnly = cleaned.replace(/\D/g, '');
    let local = '';

    if (cleaned.startsWith('+91')) {
      local = digitsOnly.slice(2);
    } else if (digitsOnly.startsWith('91') && digitsOnly.length === 12) {
      local = digitsOnly.slice(2);
    } else if (digitsOnly.startsWith('0') && digitsOnly.length === 11) {
      local = digitsOnly.slice(1);
    } else if (digitsOnly.length === 10) {
      local = digitsOnly;
    } else {
      return null;
    }

    if (!/^[6-9]\d{9}$/.test(local)) return null;
    return `+91${local}`;
  };

  const handleSubscribe = async () => {
    if (!email.trim()) {
      Toast.show({ type: 'error', text1: 'Please enter your email' });
      return;
    }

    const phoneTrimmed = phone.trim();
    let normalizedPhone: string | undefined;
    if (phoneTrimmed) {
      const candidate = normalizeIndianPhone(phoneTrimmed);
      if (!candidate) {
        Toast.show({ type: 'error', text1: 'Enter a valid Indian number in +91 format' });
        return;
      }
      normalizedPhone = candidate;
    }

    if (phoneTrimmed && !normalizedPhone) {
      Toast.show({ type: 'error', text1: 'Enter a valid Indian number in +91 format' });
      return;
    }

    setLoading(true);
    try {
      await subscribeMailingListApi({
        email: email.trim(),
        phone: normalizedPhone,
      });
      Toast.show({ type: 'success', text1: 'Subscribed successfully!' });
      setEmail('');
      setPhone('');
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to subscribe' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="mx-4 my-4 bg-primary-darkBlue rounded-2xl p-5">
      <Text className="text-white text-lg font-brand-bold mb-1">Stay Updated</Text>
      <Text className="text-white/70 text-xs mb-4">Subscribe to get the latest deals, beauty tips, and WhatsApp updates</Text>
      <View className="mb-3">
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email"
          placeholderTextColor="#9ca3af"
          keyboardType="email-address"
          autoCapitalize="none"
          className="bg-white rounded-xl px-4 py-3 text-sm font-roboto text-gray-800"
        />
      </View>
      <View className="flex-row">
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="WhatsApp phone (+91XXXXXXXXXX)"
          placeholderTextColor="#9ca3af"
          keyboardType="phone-pad"
          autoCapitalize="none"
          className="flex-1 bg-white rounded-l-xl px-4 py-3 text-sm font-roboto text-gray-800"
        />
        <Pressable
          onPress={handleSubscribe}
          disabled={loading}
          className="bg-primary-blue px-4 py-3 rounded-r-xl items-center justify-center"
        >
          <Text className="text-white text-sm font-roboto-bold">{loading ? '...' : 'Subscribe'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

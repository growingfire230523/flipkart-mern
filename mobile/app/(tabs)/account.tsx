import React, { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Image } from 'expo-image';
import { AppDispatch, RootState } from '../../src/store';
import { logoutUser } from '../../src/store/slices/userSlice';
import Svg, { Path } from 'react-native-svg';

const ChevronRight = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2}>
    <Path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const Icon = ({ children }: { children: React.ReactNode }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#24171a" strokeWidth={2}>
    {children}
  </Svg>
);

const OrdersIcon = () => (
  <Icon>
    <Path d="M3 7h18" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M6 7v12h12V7" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M9 12h6" strokeLinecap="round" strokeLinejoin="round" />
  </Icon>
);

const AddressIcon = () => (
  <Icon>
    <Path d="M12 21s7-4.5 7-11a7 7 0 0 0-14 0c0 6.5 7 11 7 11z" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" strokeLinecap="round" strokeLinejoin="round" />
  </Icon>
);

const WishlistIcon = () => (
  <Icon>
    <Path
      d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icon>
);

const CompareIcon = () => (
  <Icon>
    <Path d="M10 3H3v7h7V3z" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M21 3h-7v7h7V3z" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M21 14h-7v7h7v-7z" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M10 14H3v7h7v-7z" strokeLinecap="round" strokeLinejoin="round" />
  </Icon>
);

const ProfileIcon = () => (
  <Icon>
    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" strokeLinecap="round" strokeLinejoin="round" />
  </Icon>
);

const PasswordIcon = () => (
  <Icon>
    <Path d="M7 11h10" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M7 11a5 5 0 0 1 10 0v1H7v-1z" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M6 12v8h12v-8" strokeLinecap="round" strokeLinejoin="round" />
  </Icon>
);

const AdminIcon = () => (
  <Icon>
    <Path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7z" strokeLinecap="round" strokeLinejoin="round" />
  </Icon>
);

const LogoutIcon = () => (
  <Icon>
    <Path d="M10 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M15 12H3" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M21 21V3" strokeLinecap="round" strokeLinejoin="round" />
  </Icon>
);

const Card = ({ children }: { children: React.ReactNode }) => (
  <View className="mx-4 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
    {children}
  </View>
);

const Divider = () => <View className="h-[1px] bg-gray-100 w-full" />;

const StatusPill = ({ text, variant }: { text: string; variant: 'ok' | 'warn' | 'muted' }) => {
  const { bg, fg } =
    variant === 'ok'
      ? { bg: '#eaffea', fg: '#2a5f44' }
      : variant === 'warn'
      ? { bg: '#fff4db', fg: '#b76e79' }
      : { bg: '#f3f4f6', fg: '#7b6f6a' };

  return (
    <View style={{ backgroundColor: bg }} className="rounded-full px-3 py-1">
      <Text style={{ color: fg }} className="text-[11px] font-roboto-bold">
        {text}
      </Text>
    </View>
  );
};

function IconButtonRow({
  icon,
  label,
  onPress,
  right,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  right?: React.ReactNode;
}) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center justify-between bg-white px-4 py-4 border-b border-gray-50">
      <View className="flex-row items-center flex-1">
        <View className="mr-3">{icon}</View>
        <Text className="text-base font-roboto text-gray-800" numberOfLines={1}>
          {label}
        </Text>
      </View>
      {right || <ChevronRight />}
    </Pressable>
  );
}

export default function AccountScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.user);

  const phoneMeta = useMemo(() => {
    const phone = user?.phone ? String(user.phone) : '';
    if (!phone) {
      return { text: 'Not added', variant: 'muted' as const };
    }
    return {
      text: user?.phoneVerified ? 'Verified' : 'Not verified',
      variant: user?.phoneVerified ? ('ok' as const) : ('warn' as const),
    };
  }, [user?.phone, user?.phoneVerified]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          dispatch(logoutUser());
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-cream items-center justify-center px-8" edges={['top']}>
        <Text className="text-3xl font-brand-bold text-primary-darkBlue mb-2">Welcome to LEXI</Text>
        <Text className="text-sm text-primary-grey text-center mb-8">
          Login to access your account, orders, and more
        </Text>
        <Pressable
          onPress={() => router.push('/(auth)/login')}
          className="bg-primary-blue w-full py-3.5 rounded-xl items-center mb-3"
        >
          <Text className="text-white font-roboto-bold text-base">Login</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/(auth)/register')}
          className="border border-primary-blue w-full py-3.5 rounded-xl items-center"
        >
          <Text className="text-primary-blue font-roboto-bold text-base">Create Account</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Personal header (phone-friendly) */}
        <View className="mx-4 mt-4 mb-4 bg-primary-darkBlue rounded-2xl overflow-hidden border border-white/10">
          <View className="px-4 pt-5 pb-4 flex-row items-center">
            <View className="bg-white/10 rounded-2xl p-2">
              <Image
                source={{ uri: user?.avatar?.url || 'https://via.placeholder.com/100' }}
                className="w-16 h-16 rounded-full"
                contentFit="cover"
              />
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-xl font-roboto-bold text-white" numberOfLines={1}>
                {user?.name}
              </Text>
              <Text className="text-xs text-white/70 mt-1 font-roboto" numberOfLines={1}>
                {user?.email}
              </Text>
              <View className="mt-2">
                <StatusPill
                  text={user?.role === 'admin' ? 'Admin' : 'Account'}
                  variant={user?.role === 'admin' ? 'ok' : 'muted'}
                />
              </View>
            </View>
          </View>
          <View className="px-4 pb-5 flex-row">
            <Pressable
              onPress={() => router.push('/orders')}
              className="flex-1 bg-white/10 rounded-xl px-4 py-3 mr-2 border border-white/10"
            >
              <Text className="text-xs text-white/90 font-roboto-bold">My Orders</Text>
              <Text className="text-[10px] text-white/70 mt-0.5 font-roboto">Track & manage</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/account/manage-addresses')}
              className="flex-1 bg-white rounded-xl px-4 py-3 border border-gray-100"
            >
              <Text className="text-xs font-roboto-bold text-primary-darkBlue">Addresses</Text>
              <Text className="text-[10px] text-primary-grey mt-0.5 font-roboto">Delivery details</Text>
            </Pressable>
          </View>
        </View>

        {/* Personal Information */}
        <Card>
          <View className="px-4 pt-4 pb-3">
            <Text className="text-sm font-roboto-bold text-primary-darkBlue mb-2">Personal Information</Text>

            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-xs text-primary-grey font-roboto">Gender</Text>
              <Text className="text-xs text-gray-800 font-roboto-bold">{user?.gender || '—'}</Text>
            </View>

            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-xs text-primary-grey font-roboto">Sign-in provider</Text>
              <Text className="text-xs text-gray-800 font-roboto-bold">{user?.authProvider || 'local'}</Text>
            </View>
          </View>
          <Divider />
          <IconButtonRow
            icon={<ProfileIcon />}
            label="Update Profile"
            onPress={() => router.push('/account/update-profile')}
            right={<Text className="text-xs text-primary-blue font-roboto-bold">Edit</Text>}
          />
        </Card>

        {/* Email & Security */}
        <Card>
          <View className="px-4 pt-4 pb-3">
            <Text className="text-sm font-roboto-bold text-primary-darkBlue mb-2">Email Address</Text>
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-primary-grey font-roboto">Email</Text>
              <Text className="text-xs text-gray-800 font-roboto-bold" numberOfLines={1}>
                {user?.email}
              </Text>
            </View>
          </View>
          <Divider />
          <IconButtonRow icon={<PasswordIcon />} label="Change Password" onPress={() => router.push('/account/update-password')} />
        </Card>

        {/* Phone & Delivery Address */}
        <Card>
          <View className="px-4 pt-4 pb-3">
            <Text className="text-sm font-roboto-bold text-primary-darkBlue mb-2">
              Contact & Primary Delivery
            </Text>

            <View className="mb-3">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-xs text-primary-grey font-roboto">Phone</Text>
                <StatusPill text={phoneMeta.text} variant={phoneMeta.variant} />
              </View>
              <Text className="text-xs text-gray-800 font-roboto-bold" numberOfLines={1}>
                {user?.phone ? user.phone : '—'}
              </Text>
              {user?.phone ? null : (
                <Text className="text-[11px] text-primary-grey mt-1 font-roboto" numberOfLines={2}>
                  Add/verify phone on web for WhatsApp + delivery updates.
                </Text>
              )}
            </View>

            <View>
              <Text className="text-xs text-primary-grey font-roboto mb-1">Primary address</Text>
              <Text className="text-xs text-gray-800 font-roboto-bold" numberOfLines={2}>
                {user?.defaultShippingAddress?.address || 'Not set'}
              </Text>
              {user?.defaultShippingAddress?.pincode ? (
                <Text className="text-[11px] text-gray-700 font-roboto mt-0.5" numberOfLines={1}>
                  {user?.defaultShippingAddress?.pincode}
                </Text>
              ) : null}
            </View>
          </View>
          <Divider />
          <IconButtonRow
            icon={<AddressIcon />}
            label="Manage Addresses"
            onPress={() => router.push('/account/manage-addresses')}
            right={<Text className="text-xs text-primary-blue font-roboto-bold">Edit</Text>}
          />
        </Card>

        {/* Quick actions */}
        <Card>
          <IconButtonRow icon={<OrdersIcon />} label="My Orders" onPress={() => router.push('/orders')} />
          <Divider />
          <IconButtonRow icon={<WishlistIcon />} label="Wishlist" onPress={() => router.push('/(tabs)/wishlist')} />
          <Divider />
          <IconButtonRow icon={<CompareIcon />} label="Compare Products" onPress={() => router.push('/compare')} />
        </Card>

        {user?.role === 'admin' && (
          <Card>
            <IconButtonRow icon={<AdminIcon />} label="Admin panel" onPress={() => router.push('/admin')} />
          </Card>
        )}

        {/* FAQs */}
        <View className="mx-4 mt-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <Text className="text-sm font-roboto-bold text-primary-darkBlue mb-2">FAQs</Text>
          <Text className="text-xs font-roboto-bold text-gray-800 mb-1">What happens when I update my email address?</Text>
          <Text className="text-[11px] text-primary-grey font-roboto leading-5 mb-3">
            Your account keeps working. Any order updates and communications use the updated contact details.
          </Text>
          <Text className="text-xs font-roboto-bold text-gray-800 mb-1">When is my delivery address used?</Text>
          <Text className="text-[11px] text-primary-grey font-roboto leading-5">
            Saving an address updates your primary delivery location and is used to prefill checkout.
          </Text>
        </View>

        {/* Deactivate (web-only currently) */}
        <Pressable
          onPress={() => Alert.alert('Coming soon', 'Deactivate account is available on the web app right now.')}
          className="mx-4 mt-4 bg-white rounded-xl py-4 items-center shadow-sm border border-gray-100"
        >
          <Text className="text-sm font-roboto-bold text-primary-blue">Deactivate account</Text>
        </Pressable>

        {/* Logout */}
        <Pressable
          onPress={handleLogout}
          className="mx-4 mt-3 bg-white rounded-xl py-4 items-center shadow-sm border border-gray-100"
        >
          <View className="flex-row items-center">
            <View className="mr-2">
              <LogoutIcon />
            </View>
            <Text className="text-base font-roboto-bold text-red-500">Logout</Text>
          </View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

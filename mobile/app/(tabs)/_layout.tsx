import React, { useMemo, useState, useRef, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/store';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

const HomeIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
    <Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M9 22V12h6v10" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const GridIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
    <Path d="M3 3h7v7H3z" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 3h7v7h-7z" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 14h7v7h-7z" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M3 14h7v7H3z" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const SparkleIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
    <Path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M18 14l.7 2.3L21 17l-2.3.7L18 20l-.7-2.3L15 17l2.3-.7L18 14z" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const HeartIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
    <Path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CartIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
    <Path
      d="M6 6h15l-2 9H7L6 6Z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M6 6 5 3H2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M17 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const UserIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
    <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 3a4 4 0 100 8 4 4 0 000-8z" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ChatIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
    <Path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const SearchIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
    <Path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14z" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const KitIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
    <Path d="M20 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M16 7a4 4 0 0 0-8 0" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M2 12h20" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const FragranceIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
    <Path d="M10 3h4v3h-4z" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 6v2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M7 8h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 13a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 11v2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const WandIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
    <Path d="M15 4l5 5L8 21l-5-5 12-12z" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M5 3v4M3 5h4" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M19 13v4M17 15h4" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;

// Rainbow arc items – listed left-to-right
const LEXI_ITEMS = [
  {
    id: 'fragrance',
    label: 'Find My\nFragrance',
    Icon: FragranceIcon,
    colors: ['#7c3aed', '#a78bfa'] as [string, string],
    route: '/fragrance-finder',
  },
  {
    id: 'recommender',
    label: 'AI Cosmetic\nRecommender',
    Icon: WandIcon,
    colors: ['#db2777', '#f472b6'] as [string, string],
    route: '/lexi-recommendations',
  },
  {
    id: 'kit',
    label: 'Make\nMy Kit',
    Icon: KitIcon,
    colors: ['#d97706', '#fbbf24'] as [string, string],
    route: '/make-my-kit',
  },
  {
    id: 'chat',
    label: 'Lexy AI\nChatbot',
    Icon: ChatIcon,
    colors: ['#0891b2', '#67e8f9'] as [string, string],
    route: '/lexi-chat',
  },
] as const;

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const cartCount = useSelector((s: RootState) =>
    s.cart.cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
  );
  const [lexiOpen, setLexiOpen] = useState(false);

  // Animation values
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const itemAnims = useRef(LEXI_ITEMS.map(() => new Animated.Value(0))).current;

  const openLexi = useCallback(() => {
    setLexiOpen(true);
    Animated.parallel([
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      ...itemAnims.map((anim, i) =>
        Animated.spring(anim, {
          toValue: 1,
          delay: i * 70,
          friction: 5,
          tension: 90,
          useNativeDriver: true,
        })
      ),
    ]).start();
  }, [overlayAnim, itemAnims]);

  const closeLexi = useCallback(() => {
    Animated.parallel([
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      ...itemAnims.map((anim) =>
        Animated.timing(anim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        })
      ),
    ]).start(() => setLexiOpen(false));
  }, [overlayAnim, itemAnims]);

  const isLexiFocused = useMemo(() => {
    const active = state.routes?.[state.index];
    return String(active?.name || '') === 'lexi';
  }, [state.index, state.routes]);

  const iconsByName: Record<string, React.FC<{ color: string; size: number }>> = {
    index: HomeIcon,
    shop: GridIcon,
    lexi: SparkleIcon,
    cart: CartIcon,
    account: UserIcon,
    // wishlist exists as a route file, but we hide it below
    wishlist: HeartIcon,
  };

  const labelsByName: Record<string, string> = {
    index: 'Home',
    shop: 'Shop',
    lexi: 'Lexi',
    cart: 'Cart',
    account: 'Account',
    wishlist: 'Wishlist',
  };

  return (
    <View style={styles.tabBarWrapper}>
      {lexiOpen && (
        <Animated.View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: SCREEN_H,
            zIndex: 40,
            opacity: overlayAnim,
          }}
        >
          {/* Full-screen blur – covers the content BEHIND the tab bar only */}
          <BlurView intensity={65} tint="dark" style={StyleSheet.absoluteFillObject} />
          {/* Tap outside to close */}
          <Pressable style={StyleSheet.absoluteFillObject} onPress={closeLexi} />

          {/* Rainbow arc items – bottom values measured from screen bottom */}
          {(() => {
            const tabBarH = Math.max(insets.bottom, 16) + 72;
            const R = 148;
            const angles = [158, 118, 62, 22];
            return LEXI_ITEMS.map((item, i) => {
              const rad = (angles[i] * Math.PI) / 180;
              const itemLeft = SCREEN_W / 2 + R * Math.cos(rad) - 40;
              const itemBottom = tabBarH + R * Math.sin(rad);

              return (
                <Animated.View
                  key={item.id}
                  pointerEvents="box-none"
                  style={{
                    position: 'absolute',
                    left: itemLeft,
                    bottom: itemBottom,
                    alignItems: 'center',
                    width: 80,
                    transform: [{ scale: itemAnims[i] }],
                    opacity: itemAnims[i],
                  }}
                >
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      closeLexi();
                      setTimeout(() => router.push(item.route as any), 200);
                    }}
                    style={{ alignItems: 'center' }}
                  >
                    <LinearGradient
                      colors={item.colors}
                      style={styles.arcIcon}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <item.Icon color="#ffffff" size={26} />
                    </LinearGradient>
                    <Text style={styles.arcLabel}>{item.label}</Text>
                  </Pressable>
                </Animated.View>
              );
            });
          })()}
        </Animated.View>
      )}
      <BlurView
        intensity={80}
        tint="systemChromeMaterialLight"
        style={[styles.blurView, { zIndex: 50 }]}
      >
        <View style={[styles.tabBarInner, { paddingBottom: Math.max(insets.bottom - 14, 4) }]}>
          {state.routes.map((route: any, index: number) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            const routeName = String(route?.name || '');

            // Hide wishlist tab to match requested bottom nav parity.
            if (routeName === 'wishlist') return null;

            const isCenter = routeName === 'lexi';

            const onPress = () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

              // Toggle Lexi AI radial menu instead of navigating.
              if (routeName === 'lexi') {
                if (lexiOpen) closeLexi(); else openLexi();
                return;
              }

              // Close Lexi menu when moving to other tabs.
              if (lexiOpen) closeLexi();

              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const color = isFocused ? '#875c43' : '#7b6f6a';
            const iconSize = isCenter ? 28 : 26;

            const Icon = iconsByName[routeName] || HomeIcon;
            const label = labelsByName[routeName] || '';

            if (isCenter) {
              return (
                <Pressable
                  key={route.key}
                  onPress={onPress}
                  onLongPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    closeLexi();
                    router.push('/lexi-chat');
                  }}
                  delayLongPress={250}
                  style={styles.centerTabContainer}
                >
                  <LinearGradient
                    colors={['#875c43', '#b76e79']}
                    style={styles.centerButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Icon color="#ffffff" size={iconSize} />
                  </LinearGradient>
                  <Text style={[styles.label, { color: (isFocused || lexiOpen || isLexiFocused) ? '#875c43' : '#7b6f6a' }]}>
                    {label}
                  </Text>
                </Pressable>
              );
            }

            return (
              <Pressable key={route.key} onPress={onPress} style={styles.tabItem}>
                <View>
                  <Icon color={color} size={iconSize} />
                  {routeName === 'cart' && cartCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {cartCount > 9 ? '9+' : cartCount}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.label, { color }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(135, 92, 67, 0.12)',
  },
  arcIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  arcLabel: {
    marginTop: 7,
    fontSize: 12,
    fontFamily: 'Roboto-Medium',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 16,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  blurView: {
    overflow: 'visible',
  },
  tabBarInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingTop: 10,
    paddingBottom: 6,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 2,
  },
  centerTabContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginTop: -30,
    gap: 4,
  },
  centerButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#875c43',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  label: {
    fontSize: 11,
    fontFamily: 'Roboto-Medium',
    letterSpacing: 0.5,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: '#b76e79',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontFamily: 'Roboto-Bold',
  },
});

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="shop" />
      <Tabs.Screen name="lexi" />
      <Tabs.Screen name="cart" />
      <Tabs.Screen name="account" />
    </Tabs>
  );
}

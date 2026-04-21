import React from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import Svg, { Path, Rect, Circle, Polygon } from 'react-native-svg';

// ── Icons ────────────────────────────────────────────────────────────────────

const GiftIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#24171a" strokeWidth={1.6}>
    <Path d="M20 12v10H4V12" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M22 7H2v5h20V7z" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 22V7" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const TruckIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#24171a" strokeWidth={1.6}>
    <Path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx={5.5} cy={18.5} r={2.5} />
    <Circle cx={18.5} cy={18.5} r={2.5} />
  </Svg>
);

const LoyaltyIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#24171a" strokeWidth={1.6}>
    <Path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const UserIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#24171a" strokeWidth={1.6}>
    <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx={12} cy={7} r={4} />
  </Svg>
);

const DownloadIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#24171a" strokeWidth={1.6}>
    <Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M7 10l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CalendarIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#24171a" strokeWidth={1.6}>
    <Rect x={3} y={4} width={18} height={18} rx={2} ry={2} />
    <Path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const FacebookIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#24171a" strokeWidth={1.8}>
    <Path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const InstagramIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#24171a" strokeWidth={1.8}>
    <Rect x={2} y={2} width={20} height={20} rx={5} ry={5} />
    <Path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M17.5 6.5h.01" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const TwitterIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#24171a" strokeWidth={1.8}>
    <Path d="M23 3a10.9 10.9 0 01-3.14 1.53A4.48 4.48 0 0012 8v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const YoutubeIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#24171a" strokeWidth={1.8}>
    <Path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20.06 12 20.06 12 20.06s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58z" strokeLinecap="round" strokeLinejoin="round" />
    <Polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" />
  </Svg>
);

// ── Data ─────────────────────────────────────────────────────────────────────

const perks = [
  { Icon: GiftIcon,     title: 'Gift Wrapping',         body: 'Available at checkout.' },
  { Icon: TruckIcon,    title: 'Free Delivery',          body: 'On orders above threshold.' },
  { Icon: LoyaltyIcon,  title: 'Rewards & Benefits',     body: "With MILAARI's Loyalty Club." },
  { Icon: UserIcon,     title: 'Beauty Profile',         body: 'Get personalised picks.' },
  { Icon: DownloadIcon, title: 'Download the App',       body: 'Easy beauty for you.' },
  { Icon: CalendarIcon, title: '1:1 Beauty Consult',     body: "Book with MILAARI's artists." },
];

const footerLinks = [
  {
    title: 'ABOUT',
    links: ['Store Locator', 'About MILAARI', 'Careers', 'Privacy Policy', 'Cookies Policy'],
  },
  {
    title: 'SUPPORT',
    links: ['Customer Care', 'Shipping', 'Returns', 'FAQ', 'My Account', "Loyalty Club"],
  },
  {
    title: 'MORE',
    links: ['Cruelty-Free', 'Refer a Friend', 'Subscribe & Save', 'Pro Artist Programme', 'Promotions'],
  },
];

const socials = [
  { Icon: FacebookIcon,  label: 'Facebook',  url: 'https://facebook.com' },
  { Icon: InstagramIcon, label: 'Instagram', url: 'https://instagram.com' },
  { Icon: TwitterIcon,   label: 'Twitter',   url: 'https://twitter.com' },
  { Icon: YoutubeIcon,   label: 'YouTube',   url: 'https://youtube.com' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function FooterSection() {
  return (
    <View className="mt-4">

      {/* Perks strip */}
      <View className="bg-gray-100 border-t border-black/10 px-4 py-6">
        <View className="flex-row flex-wrap">
          {perks.map(({ Icon, title, body }) => (
            <View key={title} className="w-1/2 items-center text-center px-2 mb-5">
              <Icon />
              <Text className="text-primary-darkBlue text-sm font-brand-semibold mt-2 text-center">{title}</Text>
              <Text className="text-primary-grey text-xs mt-0.5 text-center">{body}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Link columns */}
      <View className="bg-white border-t border-black/10 px-4 py-6">
        <View className="flex-row">
          {footerLinks.map((col) => (
            <View key={col.title} className="flex-1">
              <Text className="text-primary-darkBlue text-xs font-roboto-bold tracking-widest mb-3">{col.title}</Text>
              {col.links.map((link) => (
                <Text key={link} className="text-primary-grey text-xs mb-2">{link}</Text>
              ))}
            </View>
          ))}
        </View>
      </View>

      {/* Social + shipping */}
      <View className="bg-white border-t border-black/10 px-4 py-5">
        <View className="flex-row gap-5 mb-4">
          {socials.map(({ Icon, label, url }) => (
            <Pressable key={label} onPress={() => Linking.openURL(url)} hitSlop={8}>
              <Icon />
            </Pressable>
          ))}
        </View>
        <Text className="text-primary-darkBlue text-xs font-roboto-bold tracking-widest mb-1">SHIPPING TO</Text>
        <Text className="text-primary-grey text-xs">India  |  EN  |  INR ₹</Text>
      </View>

      {/* Legal */}
      <View className="bg-white border-t border-black/10 px-4 py-5">
        <Text className="text-primary-grey text-xs leading-5">
          2013–2025 © Islestarr Holdings Ltd., trading as MILAARI. All rights reserved.
        </Text>
        <View className="flex-row flex-wrap mt-3 gap-x-4 gap-y-1">
          {['Privacy Policy', 'Cookies Policy', 'Terms & Conditions', 'Manage Cookies'].map((item) => (
            <Text key={item} className="text-primary-darkBlue text-xs underline">{item}</Text>
          ))}
        </View>
      </View>

    </View>
  );
}

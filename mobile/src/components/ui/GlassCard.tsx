import React from 'react';
import { View, ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';

interface Props extends ViewProps {
  intensity?: number;
  children: React.ReactNode;
  className?: string;
}

const GlassCard: React.FC<Props> = ({ intensity = 60, children, className, style, ...rest }) => {
  return (
    <View className={`rounded-2xl overflow-hidden ${className}`} style={style} {...rest}>
      <BlurView intensity={intensity} tint="systemChromeMaterialLight" className="p-4">
        {children}
      </BlurView>
    </View>
  );
};

export default GlassCard;

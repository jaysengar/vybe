import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { colors, radii } from '../../theme/colors';

type ButtonVariant = 'default' | 'secondary' | 'destructive' | 'ghost' | 'outline';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  variant = 'default',
  size = 'default',
  onPress,
  disabled,
  loading,
  children,
  style,
  textStyle,
}: ButtonProps) {
  const variantStyles = variantMap[variant];
  const sizeStyles = sizeMap[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.base,
        variantStyles.container,
        sizeStyles.container,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles.text.color} />
      ) : typeof children === 'string' ? (
        <Text style={[styles.text, variantStyles.text, sizeStyles.text, textStyle]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}

const variantMap: Record<ButtonVariant, { container: ViewStyle; text: TextStyle }> = {
  default: {
    container: { backgroundColor: colors.primary },
    text: { color: colors.primaryForeground },
  },
  secondary: {
    container: { backgroundColor: colors.secondary },
    text: { color: colors.secondaryForeground },
  },
  destructive: {
    container: { backgroundColor: colors.destructive },
    text: { color: colors.destructiveForeground },
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    text: { color: colors.foreground },
  },
  outline: {
    container: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
    text: { color: colors.foreground },
  },
};

const sizeMap: Record<ButtonSize, { container: ViewStyle; text: TextStyle }> = {
  default: { container: { height: 44, paddingHorizontal: 20 }, text: { fontSize: 14 } },
  sm: { container: { height: 36, paddingHorizontal: 14 }, text: { fontSize: 13 } },
  lg: { container: { height: 48, paddingHorizontal: 28 }, text: { fontSize: 16 } },
  icon: { container: { height: 40, width: 40, paddingHorizontal: 0 }, text: { fontSize: 14 } },
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    gap: 8,
  },
  text: {
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});

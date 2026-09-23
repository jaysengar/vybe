import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}

export function Switch({ checked, onCheckedChange }: SwitchProps) {
  const translateX = useRef(new Animated.Value(checked ? 18 : 2)).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: checked ? 18 : 2,
      useNativeDriver: true,
      speed: 28,
      bounciness: 4,
    }).start();
  }, [checked]);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onCheckedChange(!checked)}
      style={[styles.track, checked ? styles.trackOn : styles.trackOff]}
    >
      <Animated.View
        style={[styles.thumb, { transform: [{ translateX }] }]}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 44,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
  },
  trackOn: {
    backgroundColor: colors.primary,
  },
  trackOff: {
    backgroundColor: colors.input,
  },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
});

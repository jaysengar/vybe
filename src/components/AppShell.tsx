import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Gem } from 'lucide-react-native';
import { colors, radii } from '../theme/colors';
import { useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';

export function BrandMark() {
  return (
    <View style={styles.brandContainer}>
      <View style={styles.brandMark}>
        <View style={[styles.brandBar, styles.brandBar1]} />
        <View style={[styles.brandBar, styles.brandBar2]} />
      </View>
      <Text style={styles.brandText}>VYBE</Text>
    </View>
  );
}

export function TopBar() {
  const router = useRouter();
  return (
    <View style={styles.topBar}>
      <BrandMark />
      <View style={styles.topBarRight}>
        <View style={styles.coinPill}>
          <Gem size={14} color={colors.primary} fill={colors.primary} />
          <Text style={styles.coinText}>1,240</Text>
        </View>
        <TouchableOpacity
          style={styles.avatarMini}
          onPress={() => router.push('/settings' as any)}
        >
          <Text style={styles.avatarText}>JT</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandMark: {
    width: 25,
    height: 25,
    transform: [{ rotate: '45deg' }],
  },
  brandBar: {
    position: 'absolute',
    width: 8,
    height: 24,
    borderRadius: 9999,
  },
  brandBar1: {
    left: 3,
    top: 2,
    backgroundColor: colors.primary,
  },
  brandBar2: {
    left: 14,
    top: -3,
    backgroundColor: colors.ring,
  },
  brandText: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.foreground,
  },
  topBar: {
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.45)',
    borderRadius: radii.full,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(124,58,237,0.14)',
  },
  coinText: {
    color: colors.ring,
    fontSize: 13,
    fontWeight: '700',
  },
  avatarMini: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  avatarText: {
    color: colors.foreground,
    fontSize: 11,
    fontWeight: '800',
  },
});

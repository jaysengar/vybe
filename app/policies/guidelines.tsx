import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { colors, radii } from '../../src/theme/colors';

export default function GuidelinesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Community Guidelines</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.text}>
          Welcome to VYBE! We want this to be a safe, fun, and respectful environment for everyone.
          {'\n\n'}
          1. Be Respectful: Treat others as you would like to be treated. Do not harass, bully, or abuse other users.
          {'\n\n'}
          2. No Nudity or Sexual Content: We strictly prohibit sexually explicit content. Our automated systems and moderation team will ban users who violate this rule.
          {'\n\n'}
          3. Age Requirement: You must be at least 18 years old to use VYBE.
          {'\n\n'}
          4. No Spam or Scams: Do not use VYBE for commercial purposes, spamming, or scamming other users.
          {'\n\n'}
          5. Protect Your Privacy: Be careful about the personal information you share with strangers.
          {'\n\n'}
          Violating these guidelines may result in a permanent ban from the platform.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  content: { padding: 24 },
  text: { fontSize: 15, color: colors.foreground, lineHeight: 24 },
});

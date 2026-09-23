import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { colors } from '../../src/theme/colors';

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.text}>
          How we collect, use, and protect your data.
          {'\n\n'}
          1. Data Collection
          {'\n'}
          We collect information you provide directly to us, such as when you create an account, update your profile, or communicate with others. We also automatically collect some information about your device and usage, including location data if you grant permission.
          {'\n\n'}
          2. Use of Information
          {'\n'}
          We use the information we collect to operate, maintain, and improve our services, to match you with other users, and to communicate with you.
          {'\n\n'}
          3. Facial Recognition
          {'\n'}
          We use facial recognition technology during the onboarding process to verify that you are a real person and to prevent bots and spam. We do not store biometric templates after verification is complete.
          {'\n\n'}
          4. Data Sharing
          {'\n'}
          We do not sell your personal information to third parties. We may share data with service providers who assist us in operating our platform (e.g., cloud hosting, payment processing).
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

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { colors } from '../../src/theme/colors';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.text}>
          These Terms of Service govern your use of VYBE.
          {'\n\n'}
          By creating an account, you agree to these terms.
          {'\n\n'}
          1. Account Registration
          {'\n'}
          You must be at least 18 years old. You are responsible for maintaining the confidentiality of your account credentials.
          {'\n\n'}
          2. Content
          {'\n'}
          You retain ownership of any content you share, but you grant us a license to use it to operate the service. Do not post illegal, hateful, or explicit content.
          {'\n\n'}
          3. Virtual Currency (Gems/Diamonds)
          {'\n'}
          Gems purchased or earned have no real-world monetary value and cannot be exchanged for cash. We reserve the right to modify the pricing and availability of Gems at any time.
          {'\n\n'}
          4. Termination
          {'\n'}
          We may suspend or terminate your account if you violate these terms or our Community Guidelines.
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

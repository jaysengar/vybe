import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { colors } from '../../src/theme/colors';

export default function SafetyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Safety Center</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.text}>
          Your safety is our top priority.
          {'\n\n'}
          Reporting and Blocking:
          {'\n'}
          If you encounter inappropriate behavior, you can report the user directly from the video call interface. Our 24/7 moderation team will review the report. You can also block users to prevent them from matching with you again.
          {'\n\n'}
          Automated Moderation:
          {'\n'}
          We use AI-powered image recognition to detect and automatically blur inappropriate content in real-time. Repeated violations will result in account suspension.
          {'\n\n'}
          Safety Tips:
          {'\n'}
          - Do not share sensitive personal information (address, phone number, financial details).
          {'\n'}
          - Be mindful of your background when on a video call.
          {'\n'}
          - Trust your instincts. If a conversation makes you uncomfortable, end the call immediately.
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

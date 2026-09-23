import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radii } from '../src/theme/colors';
import { Button } from '../src/components/ui/Button';
import { CustomAlert } from '../src/components/ui/CustomAlert';
import { API_BASE_URL } from '../src/config';

export default function OnboardingScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | null>(null);
  const [loading, setLoading] = useState(false);
  const [alertState, setAlertState] = useState({ visible: false, title: '', message: '' });

  const handleComplete = async () => {
    if (!age || !gender) {
      setAlertState({ visible: true, title: 'Error', message: 'Please fill in all fields.' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/complete-onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          age: parseInt(age, 10),
          gender,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        
        if (data.user.verificationStatus === 'unverified') {
          router.replace('/verify');
        } else {
          router.replace('/(tabs)');
        }
      } else {
        setAlertState({ visible: true, title: 'Error', message: data.error || 'Failed to save details' });
      }
    } catch (error) {
      console.error(error);
      setAlertState({ visible: true, title: 'Error', message: 'Could not connect to the server.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Just a few details...</Text>
        <Text style={styles.subtitle}>We need this to find the right matches for you.</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Your Age</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 21"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="number-pad"
            value={age}
            onChangeText={setAge}
            maxLength={2}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Your Gender</Text>
          <View style={styles.genderRow}>
            {(['Male', 'Female'] as const).map((g) => (
              <TouchableOpacity
                key={g}
                style={[
                  styles.genderOption,
                  gender === g && styles.genderSelected
                ]}
                onPress={() => setGender(g)}
              >
                <Text style={[
                  styles.genderText,
                  gender === g && styles.genderTextSelected
                ]}>
                  {g}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Button onPress={handleComplete} disabled={loading} style={{ marginTop: 24 }}>
          {loading ? 'Saving...' : 'Complete Setup'}
        </Button>
      </View>
      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        onPrimaryPress={() => setAlertState({ ...alertState, visible: false })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.foreground,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.mutedForeground,
    marginBottom: 40,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.foreground,
    fontSize: 16,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  genderOption: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    borderRadius: radii.xl,
    alignItems: 'center',
  },
  genderSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  genderText: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '600',
  },
  genderTextSelected: {
    color: colors.primaryForeground,
  },
});

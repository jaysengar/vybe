import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radii } from '../src/theme/colors';
import { Button } from '../src/components/ui/Button';
import { API_BASE_URL } from '../src/config';

export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !age || !gender) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      // In development, point to your local backend IP
      // For now we'll use localhost (or 10.0.2.2 for Android emulator)
      const API_URL = `${API_BASE_URL}/api/auth/login`; 
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          age: parseInt(age, 10),
          gender,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        router.replace('/(tabs)');
      } else {
        Alert.alert('Error', data.error || 'Failed to login');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to VYBE</Text>
        <Text style={styles.subtitle}>Create your profile to start matching</Text>

        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor={colors.mutedForeground}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Age"
          placeholderTextColor={colors.mutedForeground}
          value={age}
          onChangeText={setAge}
          keyboardType="numeric"
        />

        <Text style={styles.label}>I am a:</Text>
        <View style={styles.genderRow}>
          <TouchableOpacity
            style={[styles.genderBtn, gender === 'Male' && styles.genderBtnActive]}
            onPress={() => setGender('Male')}
          >
            <Text style={[styles.genderText, gender === 'Male' && styles.genderTextActive]}>Male</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.genderBtn, gender === 'Female' && styles.genderBtnActive]}
            onPress={() => setGender('Female')}
          >
            <Text style={[styles.genderText, gender === 'Female' && styles.genderTextActive]}>Female</Text>
          </TouchableOpacity>
        </View>

        <Button 
          onPress={handleLogin} 
          disabled={loading}
          style={styles.submitBtn}
        >
          {loading ? 'Connecting...' : 'Start Matching'}
        </Button>
      </View>
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
    fontWeight: '800',
    color: colors.foreground,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.mutedForeground,
    marginBottom: 40,
  },
  input: {
    height: 54,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.foreground,
    backgroundColor: colors.card,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
    marginTop: 8,
    marginBottom: 12,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 40,
  },
  genderBtn: {
    flex: 1,
    height: 54,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  genderBtnActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(124,58,237,0.15)',
  },
  genderText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  genderTextActive: {
    color: colors.primary,
  },
  submitBtn: {
    height: 54,
    borderRadius: radii.full,
  },
});

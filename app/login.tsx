import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { GoogleSignin, GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { colors } from '../src/theme/colors';
import { API_BASE_URL } from '../src/config';
import { CustomAlert } from '../src/components/ui/CustomAlert';

export default function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [alertState, setAlertState] = useState({ visible: false, title: '', message: '' });

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '454947608863-gb79t1qcqelledkf6unbn5j5bbd7flbc.apps.googleusercontent.com',
      scopes: ['https://www.googleapis.com/auth/user.gender.read'],
    });
  }, []);

  const getDeviceId = async () => {
    try {
      if (Platform.OS === 'android') {
        return Application.getAndroidId();
      } else {
        return await Application.getIosIdForVendorAsync();
      }
    } catch (e) {
      return 'unknown_device';
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();
      const deviceId = await getDeviceId();

      if (!userInfo.data?.user.id || !userInfo.data?.user.email) {
        throw new Error('Incomplete data from Google');
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleId: userInfo.data.user.id,
          email: userInfo.data.user.email,
          name: userInfo.data.user.name,
          deviceId,
          accessToken: tokens.accessToken
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.isNewUser) {
          if (data.token) await AsyncStorage.setItem('token', data.token);
          // Pass the user _id to onboarding screen
          router.replace({ pathname: '/onboarding', params: { userId: data.user._id } });
        } else {
          // Existing user, store and go to tabs
          await AsyncStorage.setItem('user', JSON.stringify(data.user));
          if (data.token) await AsyncStorage.setItem('token', data.token);
          if (data.user.verificationStatus === 'unverified') {
            router.replace('/verify');
          } else {
            router.replace('/(tabs)');
          }
        }
      } else {
        setAlertState({ visible: true, title: 'Error', message: data.error || 'Failed to login' });
      }
    } catch (error: any) {
      console.error(error);
      setAlertState({ visible: true, title: 'Login Failed', message: error.message || 'Could not sign in with Google' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to VYBE</Text>
        <Text style={styles.subtitle}>Sign in with Google to start matching</Text>

        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <GoogleSigninButton
            size={GoogleSigninButton.Size.Wide}
            color={GoogleSigninButton.Color.Dark}
            onPress={handleGoogleLogin}
            disabled={loading}
          />
        </View>
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
  }
});

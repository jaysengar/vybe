import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../src/theme/colors';

let Purchases: any = null;
try {
  Purchases = require('react-native-purchases').default;
} catch (e) {
  console.log('Purchases native module not found (likely running in Expo Go)');
}

let NetInfo: any = null;
try {
  NetInfo = require('@react-native-community/netinfo').default;
} catch (e) {
  console.log('NetInfo native module not found');
}
import { View, Text, StyleSheet, Platform } from 'react-native';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(true);

  useEffect(() => {
    if (NetInfo) {
      const unsubscribe = NetInfo.addEventListener((state: any) => {
        setIsConnected(!!state.isConnected);
      });
      return () => unsubscribe();
    }
  }, []);

  useEffect(() => {
    if (Purchases) {
      try {
        // Configure RevenueCat
        if (Platform.OS === 'ios') {
          Purchases.configure({ apiKey: process.env.EXPO_PUBLIC_RC_IOS_KEY || 'stub_ios_key' });
        } else if (Platform.OS === 'android') {
          Purchases.configure({ apiKey: process.env.EXPO_PUBLIC_RC_ANDROID_KEY || 'stub_android_key' });
        }
      } catch (e) {
        console.log('Purchases config failed (likely running in Expo Go)');
        Purchases = null;
      }
    }

    const checkAuth = async () => {
      const userStr = await AsyncStorage.getItem('user');
      setIsAuthenticated(!!userStr);
      if (userStr && Purchases) {
        try {
          const user = JSON.parse(userStr);
          await Purchases.logIn(user._id);
        } catch (e) {}
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated === null) return;

    const verifyRoute = async () => {
      const user = await AsyncStorage.getItem('user');
      const isAuth = !!user;
      const inAuthGroup = segments[0] === 'login';

      if (!isAuth && !inAuthGroup) {
        router.replace('/login');
      } else if (isAuth && inAuthGroup) {
        router.replace('/(tabs)');
      }
    };

    verifyRoute();
  }, [segments, isAuthenticated]);

  if (isAuthenticated === null) return null; // loading state

  return (
    <>
      <StatusBar style="light" />
      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>No Internet Connection</Text>
        </View>
      )}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="login" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="pricing" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  offlineBanner: {
    backgroundColor: colors.destructive,
    paddingTop: 50,
    paddingBottom: 10,
    alignItems: 'center',
    zIndex: 999
  },
  offlineText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold'
  }
});

import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../src/theme/colors';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const user = await AsyncStorage.getItem('user');
      setIsAuthenticated(!!user);
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
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="login" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radii } from '../src/theme/colors';
import { Button } from '../src/components/ui/Button';
import { CustomAlert } from '../src/components/ui/CustomAlert';
import { API_BASE_URL } from '../src/config';
import { ShieldCheck, Camera as CameraIcon } from 'lucide-react-native';

export default function VerifyScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  
  const [alertState, setAlertState] = useState<{
    visible: boolean;
    title: string;
    message: string;
    primaryButtonText?: string;
    onPrimaryPress?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  const closeAlert = () => setAlertState(prev => ({ ...prev, visible: false }));

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
        if (photo) {
          setPhotoUri(photo.uri);
          setPhotoBase64(photo.base64 || null);
        }
      } catch (err) {
        setAlertState({ visible: true, title: 'Error', message: 'Failed to take photo' });
      }
    }
  };

  const submitVerification = async () => {
    if (!photoBase64) return;
    setLoading(true);

    try {
      const stored = await AsyncStorage.getItem('user');
      if (!stored) throw new Error('User not found in storage');
      const user = JSON.parse(stored);

      const res = await fetch(`${API_BASE_URL}/api/auth/verify-liveness`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id, photoBase64 })
      });

      const data = await res.json();
      if (data.success) {
        // Update local storage
        user.verificationStatus = 'verified';
        await AsyncStorage.setItem('user', JSON.stringify(user));
        setAlertState({
          visible: true,
          title: 'Verified!',
          message: 'Your identity has been confirmed.',
          primaryButtonText: 'Start Matching',
          onPrimaryPress: () => {
            closeAlert();
            router.replace('/(tabs)');
          },
        });
      } else {
        setAlertState({ visible: true, title: 'Verification Failed', message: data.error || 'Please try again.' });
        setPhotoUri(null);
        setPhotoBase64(null);
      }
    } catch (err) {
      setAlertState({ visible: true, title: 'Error', message: 'Could not connect to verification server.' });
    } finally {
      setLoading(false);
    }
  };

  if (!permission) {
    return <View style={styles.container}><ActivityIndicator color={colors.primary} /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>We need camera access to verify your identity.</Text>
        <Button onPress={requestPermission} style={{ marginTop: 20 }}>Grant Permission</Button>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ShieldCheck size={32} color={colors.primary} />
        <Text style={styles.title}>Verify You're Real</Text>
        <Text style={styles.subtitle}>
          To keep VYBE safe, please take a live selfie holding up two fingers (✌️).
        </Text>
      </View>

      <View style={styles.cameraContainer}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.camera} />
        ) : (
          <CameraView 
            ref={cameraRef} 
            style={styles.camera} 
            facing="front" 
          />
        )}
      </View>

      <View style={styles.footer}>
        {photoUri ? (
          <>
            <Button variant="secondary" onPress={() => { setPhotoUri(null); setPhotoBase64(null); }} style={{ marginBottom: 12 }}>
              Retake Photo
            </Button>
            <Button onPress={submitVerification} disabled={loading}>
              {loading ? 'Verifying...' : 'Submit for Verification'}
            </Button>
          </>
        ) : (
          <Button onPress={takePicture}>
            <CameraIcon size={20} color={colors.primaryForeground} style={{ marginRight: 8 }} />
            Take Selfie
          </Button>
        )}
      </View>

      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        primaryButtonText={alertState.primaryButtonText}
        onPrimaryPress={alertState.onPrimaryPress || closeAlert}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.foreground,
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 22,
  },
  cameraContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: radii['2xl'],
    overflow: 'hidden',
    backgroundColor: colors.card,
    marginBottom: 40,
  },
  camera: {
    flex: 1,
  },
  text: {
    color: colors.foreground,
    textAlign: 'center',
  },
  footer: {
    width: '100%',
  }
});

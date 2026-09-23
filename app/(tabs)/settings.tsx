import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Bell,
  Camera,
  ChevronRight,
  CircleHelp,
  Gem,
  Globe,
  Mic,
  ShieldCheck,
  Trash2,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { colors, radii } from '../../src/theme/colors';
import { TopBar } from '../../src/components/AppShell';
import { Button } from '../../src/components/ui/Button';
import { Switch } from '../../src/components/ui/Switch';
import { API_BASE_URL } from '../../src/config';

function ToggleRow({
  icon: Icon,
  label,
  checked,
  onChange,
}: {
  icon: typeof Bell;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.settingsRow}>
      <View style={styles.settingsIcon}>
        <Icon size={16} color={colors.mutedForeground} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch checked={checked} onCheckedChange={onChange} />
    </View>
  );
}

function LinkRow({
  icon: Icon,
  label,
  danger = false,
  onPress,
}: {
  icon: typeof Bell;
  label: string;
  danger?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.settingsRow} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.settingsIcon}>
        <Icon size={16} color={danger ? colors.destructive : colors.mutedForeground} />
      </View>
      <Text style={[styles.rowLabel, danger && { color: colors.destructive }]}>
        {label}
      </Text>
      <ChevronRight size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);
  const [camera, setCamera] = useState(true);
  const [microphone, setMicrophone] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const stored = await AsyncStorage.getItem('user');
        if (stored) {
          const u = JSON.parse(stored);
          const res = await fetch(`${API_BASE_URL}/api/auth/me/${u._id}`);
          if (res.ok) {
            const data = await res.json();
            setUser(data.user);
            await AsyncStorage.setItem('user', JSON.stringify(data.user)); // sync
          }
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
      }
    };
    fetchUser();
  }, []);

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to permanently delete your account?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
             if (!user) return;
             try {
               await fetch(`${API_BASE_URL}/api/auth/delete/${user._id}`, { method: 'DELETE' });
               await AsyncStorage.removeItem('user');
               router.replace('/login');
             } catch (err) {
               Alert.alert('Error', 'Failed to delete account');
             }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.flex1, styles.bg]}>
      <TopBar />
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTag}>YOUR SPACE</Text>
        <Text style={styles.pageTitle}>Profile & settings</Text>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {user?.username ? user.username.substring(0, 2).toUpperCase() : '??'}
            </Text>
          </View>
          <View style={styles.flex1}>
            <View style={styles.profileTop}>
              <View>
                <Text style={styles.profileName}>{user?.username || 'Loading...'}</Text>
                <Text style={styles.profileLevel}>Level 8 · Good Vibes</Text>
              </View>
              <Button variant="ghost" size="sm" onPress={async () => {
                await AsyncStorage.removeItem('user');
                router.replace('/login');
              }}>
                Logout
              </Button>
            </View>
            <View style={styles.levelBar}>
              <View style={styles.levelFill} />
            </View>
            <View style={styles.xpRow}>
              <Text style={styles.xpText}>720 / 1,000 XP</Text>
              <View style={styles.gemRow}>
                <Gem size={12} color={colors.primary} fill={colors.primary} />
                <Text style={styles.gemText}>{user?.diamonds || 0}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* VIP Subscription Card */}
        <View style={styles.vipCard}>
          <View style={styles.vipTop}>
             <Gem size={20} color="#F59E0B" fill="#F59E0B" />
             <Text style={styles.vipTitle}>VYBE VIP</Text>
          </View>
          <Text style={styles.vipDesc}>Get a crown badge, priority matchmaking, and 500 free diamonds a month.</Text>
          <Button variant="default" style={styles.vipBtn} onPress={async () => {
             // Basic Razorpay Integration (same as matchmaker)
             if (!user) return;
             try {
                const res = await fetch(`${API_BASE_URL}/api/payments/create-order`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId: user._id, amount: 999, type: 'vip' })
                });
                if (res.ok) {
                   Alert.alert('Success', 'Razorpay Checkout Flow would launch here!');
                   // Mock updating user diamonds
                   const fresh = await fetch(`${API_BASE_URL}/api/auth/me/${user._id}`);
                   const freshData = await fresh.json();
                   setUser(freshData.user);
                }
             } catch (err) {
               console.error(err);
             }
          }}>
            Upgrade for ₹999/mo
          </Button>
        </View>

        {/* Preferences */}
        <Text style={styles.sectionLabel}>Preferences</Text>
        <View style={styles.settingsGroup}>
          <ToggleRow
            icon={Bell}
            label="Push notifications"
            checked={notifications}
            onChange={setNotifications}
          />
          <ToggleRow
            icon={Camera}
            label="Camera access"
            checked={camera}
            onChange={setCamera}
          />
          <ToggleRow
            icon={Mic}
            label="Microphone access"
            checked={microphone}
            onChange={setMicrophone}
          />
          <LinkRow icon={Globe} label="Language · English" />
        </View>

        {/* Match History */}
        <Text style={styles.sectionLabel}>Match History</Text>
        <View style={styles.settingsGroup}>
          <LinkRow icon={Gem} label="View past matches" />
        </View>

        {/* Safety */}
        <Text style={styles.sectionLabel}>Safety & support</Text>
        <View style={styles.settingsGroup}>
          <LinkRow icon={CircleHelp} label="Help center" />
          <LinkRow icon={ShieldCheck} label="Community guidelines" />
          <LinkRow icon={Trash2} label="Delete account" danger onPress={handleDeleteAccount} />
        </View>

        <Text style={styles.footer}>VYBE 1.0 · Safety comes first</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  bg: { backgroundColor: colors.background },
  content: { flex: 1 },
  contentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 112,
  },

  sectionTag: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  pageTitle: {
    marginTop: 4,
    marginBottom: 28,
    fontSize: 32,
    fontWeight: '700',
    color: colors.foreground,
  },

  // ---- Profile Card ----
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    marginBottom: 24,
  },
  profileAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  profileAvatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.foreground,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileName: {
    fontWeight: '700',
    color: colors.foreground,
    fontSize: 15,
  },
  profileLevel: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  levelBar: {
    marginTop: 12,
    width: '100%',
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.secondary,
    overflow: 'hidden',
  },
  levelFill: {
    width: '72%',
    height: '100%',
    backgroundColor: colors.primary,
  },
  xpRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  xpText: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  gemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gemText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },

  // ---- VIP Card ----
  vipCard: {
    padding: 16,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
    marginBottom: 24,
  },
  vipTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  vipTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F59E0B',
  },
  vipDesc: {
    fontSize: 13,
    color: colors.foreground,
    lineHeight: 20,
    marginBottom: 16,
  },
  vipBtn: {
    backgroundColor: '#F59E0B',
  },

  // ---- Section ----
  sectionLabel: {
    marginBottom: 12,
    color: colors.mutedForeground,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  settingsGroup: {
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
  },
  settingsRow: {
    flexDirection: 'row',
    minHeight: 58,
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingsIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontWeight: '600',
    color: colors.foreground,
    fontSize: 14,
  },

  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 8,
  },
});

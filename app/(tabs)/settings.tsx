import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { CustomAlert } from '../../src/components/ui/CustomAlert';
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
  X,
  FileText,
  Lock,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { colors, radii } from '../../src/theme/colors';
import { TopBar } from '../../src/components/AppShell';
import { Button } from '../../src/components/ui/Button';
import { Switch } from '../../src/components/ui/Switch';
import { API_BASE_URL } from '../../src/config';
import { socketService } from '../../src/integrations/socket';
let Purchases: any = null;
try {
  Purchases = require('react-native-purchases').default;
} catch (e) {
  Purchases = null;
}

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
  const [buyGemsOpen, setBuyGemsOpen] = useState(false);

  const [alertState, setAlertState] = useState<{
    visible: boolean;
    title: string;
    message: string;
    primaryButtonText?: string;
    onPrimaryPress?: () => void;
    secondaryButtonText?: string;
    onSecondaryPress?: () => void;
    isDestructive?: boolean;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  const closeAlert = () => setAlertState(prev => ({ ...prev, visible: false }));

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
            
            // Set preferences from db
            if (data.user.preferences) {
              setNotifications(data.user.preferences.pushNotifications);
              setCamera(data.user.preferences.cameraAccess);
              setMicrophone(data.user.preferences.micAccess);
            }

            await AsyncStorage.setItem('user', JSON.stringify(data.user)); // sync
          }
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
      }
    };
    fetchUser();

    // Listen to real-time balance updates
    const handleBalanceUpdate = (data: { diamonds: number }) => {
      setUser((prev: any) => prev ? { ...prev, diamonds: data.diamonds } : prev);
      AsyncStorage.getItem('user').then(stored => {
        if (stored) {
          const u = JSON.parse(stored);
          u.diamonds = data.diamonds;
          AsyncStorage.setItem('user', JSON.stringify(u));
        }
      });
    };

    if (socketService.socket) {
      socketService.socket.on('balance_update', handleBalanceUpdate);
    }
    
    return () => {
      if (socketService.socket) {
        socketService.socket.off('balance_update', handleBalanceUpdate);
      }
    };
  }, []);

  const updatePreference = async (key: string, value: boolean) => {
    if (!user) return;
    try {
      const newPrefs = {
        pushNotifications: key === 'pushNotifications' ? value : notifications,
        cameraAccess: key === 'cameraAccess' ? value : camera,
        micAccess: key === 'micAccess' ? value : microphone,
      };

      await fetch(`${API_BASE_URL}/api/auth/profile/${user._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: newPrefs })
      });
    } catch (err) {
      console.error('Failed to update preference:', err);
    }
  };

  const handleBuyGems = async (amount: number, priceINR: number) => {
    if (!user) return;
    if (!Purchases) {
      setAlertState({ visible: true, title: 'Error', message: 'Purchases module not available.' });
      return;
    }
    try {
      setAlertState({ visible: true, title: 'Purchasing...', message: 'Please wait' });
      
      // Fetch offerings from RevenueCat
      const offerings = await Purchases.getOfferings();
      if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
        
        // Find the package that matches our amount (this is a simplified example, usually you map amounts to specific RC package identifiers)
        const packageToBuy = offerings.current.availablePackages[0]; // Replace with matching logic
        
        const { purchaserInfo, productIdentifier } = await Purchases.purchasePackage(packageToBuy);
        
        // Verify with our backend securely using the RC App User ID
        const verifyRes = await fetch(`${API_BASE_URL}/api/payments/verify-revenuecat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user._id,
            diamondsToAdd: amount,
            rcAppUserId: await Purchases.getAppUserID()
          })
        });
        
        const verifyData = await verifyRes.json();
        if (verifyData.success) {
          setAlertState({ visible: true, title: 'Success', message: `You purchased ${amount} Gems!` });
          setBuyGemsOpen(false);
        } else {
          setAlertState({ visible: true, title: 'Error', message: 'Payment verification failed.' });
        }
      } else {
        setAlertState({ visible: true, title: 'Error', message: 'No products available.' });
      }
    } catch (err: any) {
      if (!err.userCancelled) {
        setAlertState({ visible: true, title: 'Error', message: err.message || 'Could not initiate payment.' });
      } else {
        closeAlert();
      }
    }
  };

  const handleDeleteAccount = async () => {
    setAlertState({
      visible: true,
      title: "Delete Account",
      message: "Are you sure you want to permanently delete your account?",
      primaryButtonText: "Delete",
      isDestructive: true,
      onPrimaryPress: async () => {
         closeAlert();
         if (!user) return;
         try {
           await fetch(`${API_BASE_URL}/api/auth/delete/${user._id}`, { method: 'DELETE' });
           await AsyncStorage.removeItem('user');
           router.replace('/login');
         } catch (err) {
           setAlertState({ visible: true, title: 'Error', message: 'Failed to delete account' });
         }
      },
      secondaryButtonText: "Cancel",
      onSecondaryPress: closeAlert
    });
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
                <Text style={styles.profileLevel}>Level {user?.level || 1} · Good Vibes</Text>
              </View>
              <Button variant="ghost" size="sm" onPress={async () => {
                await AsyncStorage.removeItem('user');
                router.replace('/login');
              }}>
                Logout
              </Button>
            </View>
            <View style={styles.levelBar}>
              <View style={[styles.levelFill, { width: `${Math.min(100, ((user?.xp || 0) / 1000) * 100)}%` }]} />
            </View>
            <View style={styles.xpRow}>
              <Text style={styles.xpText}>{user?.xp || 0} / 1,000 XP</Text>
              <View style={styles.gemRow}>
                <Gem size={12} color={colors.primary} fill={colors.primary} />
                <Text style={styles.gemText}>{user?.diamonds || 0}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Wallet & Gems Card */}
        <Text style={styles.sectionLabel}>Wallet & Gems</Text>
        <View style={styles.settingsGroup}>
           <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
             <View>
               <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '600', marginBottom: 4 }}>Watch Ad for Gems</Text>
               <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>Watch a short video to earn 1 Gem.</Text>
             </View>
             <Button variant="secondary" size="sm" onPress={() => {
                // Mock ad watch
                setAlertState({ visible: true, title: 'Watching Ad...', message: 'You earned 1 Gem!' });
                socketService.socket?.emit('watch_ad', { userId: user?._id });
             }}>
               Watch Ad
             </Button>
           </View>
           <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
             <View>
               <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '600', marginBottom: 4 }}>Buy Gems</Text>
               <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>Get more gems to match & chat.</Text>
             </View>
             <Button variant="default" size="sm" onPress={() => setBuyGemsOpen(true)}>
               Buy Gems
             </Button>
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
             if (!user) return;
             try {
               setAlertState({ visible: true, title: 'Purchasing VIP...', message: 'Please wait' });
               const offerings = await Purchases.getOfferings();
               if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
                 // Simplified: grab a package for VIP (e.g. index 1 or specific identifier)
                 const vipPackage = offerings.current.availablePackages.find(p => p.packageType === Purchases.PACKAGE_TYPE.MONTHLY) || offerings.current.availablePackages[0];
                 const { purchaserInfo } = await Purchases.purchasePackage(vipPackage);
                 
                 // Verify on backend
                 const verifyRes = await fetch(`${API_BASE_URL}/api/payments/verify-revenuecat`, {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({
                     userId: user._id,
                     diamondsToAdd: 500, // VIP bonus
                     isVip: true,
                     rcAppUserId: await Purchases.getAppUserID()
                   })
                 });
                 
                 const verifyData = await verifyRes.json();
                 if (verifyData.success) {
                   setAlertState({ visible: true, title: 'Welcome to VIP!', message: 'You are now a VYBE VIP.' });
                   const fresh = await fetch(`${API_BASE_URL}/api/auth/me/${user._id}`);
                   const freshData = await fresh.json();
                   setUser(freshData.user);
                 } else {
                   setAlertState({ visible: true, title: 'Error', message: 'Verification failed.' });
                 }
               } else {
                 setAlertState({ visible: true, title: 'Error', message: 'VIP Subscription not available.' });
               }
             } catch (err: any) {
               if (!err.userCancelled) {
                 setAlertState({ visible: true, title: 'Error', message: err.message || 'Could not upgrade.' });
               } else {
                 closeAlert();
               }
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
            onChange={(v) => { setNotifications(v); updatePreference('pushNotifications', v); }}
          />
          <ToggleRow
            icon={Camera}
            label="Camera access"
            checked={camera}
            onChange={(v) => { setCamera(v); updatePreference('cameraAccess', v); }}
          />
          <ToggleRow
            icon={Mic}
            label="Microphone access"
            checked={microphone}
            onChange={(v) => { setMicrophone(v); updatePreference('micAccess', v); }}
          />
          <LinkRow icon={Globe} label="Language · English" />
        </View>

        {/* Match History */}
        <Text style={styles.sectionLabel}>Match History</Text>
        <View style={styles.settingsGroup}>
          <LinkRow icon={Gem} label="View past matches" onPress={() => router.push('/messages' as any)} />
        </View>

        {/* Safety */}
        <Text style={styles.sectionLabel}>Safety & support</Text>
        <View style={styles.settingsGroup}>
          <LinkRow icon={ShieldCheck} label="Community guidelines" onPress={() => router.push('/policies/guidelines' as any)} />
          <LinkRow icon={CircleHelp} label="Safety center" onPress={() => router.push('/policies/safety' as any)} />
          <LinkRow icon={FileText} label="Terms of Service" onPress={() => router.push('/policies/terms' as any)} />
          <LinkRow icon={Lock} label="Privacy Policy" onPress={() => router.push('/policies/privacy' as any)} />
          <LinkRow icon={Trash2} label="Delete account" danger onPress={handleDeleteAccount} />
        </View>

        <Text style={styles.footer}>VYBE 1.0 · Safety comes first</Text>
      </ScrollView>

      {/* Buy Gems Modal */}
      <Modal visible={buyGemsOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Buy Gems</Text>
              <TouchableOpacity onPress={() => setBuyGemsOpen(false)} style={styles.closeBtn}>
                <X size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 24, gap: 16 }}>
              {[
                { gems: 100, price: 100, tag: 'Popular' },
                { gems: 150, price: 150, tag: 'Best Value' },
                { gems: 200, price: 200, tag: 'Premium' },
              ].map((pkg) => (
                <TouchableOpacity 
                  key={pkg.gems} 
                  style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: 16, 
                    borderWidth: 1, 
                    borderColor: colors.border, 
                    borderRadius: radii.xl 
                  }}
                  activeOpacity={0.7}
                  onPress={() => handleBuyGems(pkg.gems, pkg.price)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(236, 72, 153, 0.1)', justifyContent: 'center', alignItems: 'center' }}>
                      <Gem size={20} color={colors.primary} fill={colors.primary} />
                    </View>
                    <View>
                      <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700' }}>{pkg.gems} Gems</Text>
                      {pkg.tag && <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600', marginTop: 2 }}>{pkg.tag}</Text>}
                    </View>
                  </View>
                  <View style={{ backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radii.full }}>
                    <Text style={{ color: colors.primaryForeground, fontWeight: '600' }}>₹{pkg.price}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        primaryButtonText={alertState.primaryButtonText}
        onPrimaryPress={alertState.onPrimaryPress || closeAlert}
        secondaryButtonText={alertState.secondaryButtonText}
        onSecondaryPress={alertState.onSecondaryPress}
        isDestructive={alertState.isDestructive}
      />
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

  // ---- Modal ----
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    minHeight: 300,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.foreground,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

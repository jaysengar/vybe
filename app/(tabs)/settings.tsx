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
  Crown,
  Star,
  Coins,
  ShoppingBag,
  ClipboardList,
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
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>Me</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {user?.username ? user.username.substring(0, 1).toUpperCase() : 'J'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.username || 'Jay Sengar'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
              <Text style={styles.profileUid}>UID: {user?._id ? user._id.substring(0, 9) : '324021003'}</Text>
              <View style={styles.genderIcon}>
                <Text style={{ fontSize: 10, color: '#fff' }}>{user?.gender === 'Female' ? '♀' : '♂'}</Text>
              </View>
              <View style={styles.crownBadge}>
                <Crown size={10} color="#999" />
              </View>
            </View>
          </View>
        </View>

        {/* VIP Subscription Card (Pill) */}
        <TouchableOpacity 
          style={styles.vipPill} 
          activeOpacity={0.8}
          onPress={() => {
             router.push('/pricing');
          }}
        >
          <View style={styles.vipPillLeft}>
            <View style={styles.vipCrownIcon}>
              <Crown size={20} color="#F59E0B" fill="#F59E0B" />
            </View>
            <View>
              <Text style={styles.vipTitle}>VYBE VIP</Text>
              <Text style={styles.vipDesc}>Get More Gender Filters</Text>
            </View>
          </View>
          <ChevronRight size={20} color={colors.primary} />
        </TouchableOpacity>

        {/* 2x2 Grid */}
        <View style={styles.gridContainer}>
          <TouchableOpacity style={styles.gridItem} activeOpacity={0.7} onPress={() => {
              setAlertState({ visible: true, title: 'Watching Ad...', message: 'You earned 1 Gem!' });
              socketService.socket?.emit('watch_ad', { userId: user?._id });
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Star size={24} color="#F59E0B" fill="#F59E0B" />
              <Text style={styles.gridItemText}>Free Coins</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItem} activeOpacity={0.7} onPress={() => setBuyGemsOpen(true)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.coinIcon}>
                <Text style={{ color: '#F59E0B', fontWeight: '800', fontSize: 14 }}>C</Text>
              </View>
              <Text style={styles.gridItemText}>{user?.diamonds || 0}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItem} activeOpacity={0.7}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ShoppingBag size={24} color="#FF4B4B" fill="transparent" />
              <Text style={styles.gridItemText}>Backpack</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItem} activeOpacity={0.7} onPress={() => router.push('/messages' as any)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ClipboardList size={24} color="#F97316" />
              <Text style={styles.gridItemText}>History</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Preferences */}
        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Preferences</Text>
        <View style={styles.settingsGroup}>
          <ToggleRow icon={Bell} label="Push notifications" checked={notifications} onChange={(v) => { setNotifications(v); updatePreference('pushNotifications', v); }} />
          <ToggleRow icon={Camera} label="Camera access" checked={camera} onChange={(v) => { setCamera(v); updatePreference('cameraAccess', v); }} />
          <ToggleRow icon={Mic} label="Microphone access" checked={microphone} onChange={(v) => { setMicrophone(v); updatePreference('micAccess', v); }} />
          <LinkRow icon={Globe} label="Language · English" />
        </View>

        {/* Safety */}
        <Text style={styles.sectionLabel}>Safety & support</Text>
        <View style={styles.settingsGroup}>
          <LinkRow icon={ShieldCheck} label="Community guidelines" onPress={() => router.push('/policies/guidelines' as any)} />
          <LinkRow icon={CircleHelp} label="Safety center" onPress={() => router.push('/policies/safety' as any)} />
          <LinkRow icon={FileText} label="Terms of Service" onPress={() => router.push('/policies/terms' as any)} />
          <LinkRow icon={Lock} label="Privacy Policy" onPress={() => router.push('/policies/privacy' as any)} />
          <LinkRow icon={Trash2} label="Delete account" danger onPress={handleDeleteAccount} />
          <LinkRow icon={Trash2} label="Logout" danger onPress={async () => {
             await AsyncStorage.removeItem('user');
             router.replace('/login');
          }} />
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

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.foreground,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#65A30D', // Green avatar
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  profileAvatarText: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '600',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.foreground,
  },
  profileUid: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  genderIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crownBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 100, // pill shape
    marginBottom: 24,
  },
  vipPillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  vipCrownIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,132,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vipTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  vipDesc: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.foreground,
    marginTop: 2,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  gridItem: {
    width: '48%',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: radii.xl,
    justifyContent: 'center',
  },
  gridItemText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
  },
  coinIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(245,158,11,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
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

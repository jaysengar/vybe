import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  Easing,
  Modal,
  Dimensions,
  Alert,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronDown,
  Flag,
  Globe,
  Loader,
  MapPin,
  MessageCircle,
  Mic,
  MicOff,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
  User,
  Video,
  VideoOff,
  X,
  Heart,
} from 'lucide-react-native';
import { colors, radii } from '../../src/theme/colors';
import { TopBar } from '../../src/components/AppShell';
import { Button } from '../../src/components/ui/Button';

// WebRTC and Socket
import { RTCView } from 'react-native-webrtc';
import { socketService } from '../../src/integrations/socket';
import { useWebRTC } from '../../src/hooks/useWebRTC';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../../src/config';

const matchBg = require('../../assets/match_bg.jpg');

type Stage = 'hub' | 'queue' | 'call';
type ReportReason = 'nudity' | 'harassment' | 'underage' | 'spam' | 'other';

const reasons: { value: ReportReason; label: string }[] = [
  { value: 'nudity', label: 'Nudity' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'underage', label: 'Underage' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Other' },
];

export default function HomeScreen() {
  const [stage, setStage] = useState<Stage>('hub');
  const [region, setRegion] = useState('Global');
  const [gender, setGender] = useState('Everyone');
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const [reason, setReason] = useState<ReportReason>('harassment');
  const [cooldown, setCooldown] = useState(0);
  
  const [icebreaker, setIcebreaker] = useState<string | null>(null);
  const [giftReceived, setGiftReceived] = useState<string | null>(null);
  const [activeUsers, setActiveUsers] = useState<number>(0);

  const skipTimes = useRef<number[]>([]);

  // WebRTC Hooks
  const { localStream, remoteStream, currentTargetUserId, currentTargetSocket, initLocalStream, startCall, endCall, toggleMute, toggleCamera } = useWebRTC();

  // Animations
  const pulseAnim1 = useRef(new Animated.Value(0)).current;
  const pulseAnim2 = useRef(new Animated.Value(0)).current;
  const pulseAnim3 = useRef(new Animated.Value(0)).current;
  const radarAnim = useRef(new Animated.Value(0)).current;

  // Setup Socket Connection
  useEffect(() => {
    socketService.connect();
    const socket = socketService.socket;

    if (!socket) return;

    socket.on('match_found', (data) => {
      setStage('call');
      setIcebreaker(data.icebreaker || null);
      startCall(data.targetSocketId, data.targetUserId, data.isInitiator);
    });

    socket.on('receive_gift', (data) => {
      setGiftReceived(data.giftType);
      setTimeout(() => setGiftReceived(null), 3000);
    });

    socket.on('gift_error', (data) => {
      if (data.reason === 'insufficient_diamonds') {
        Alert.alert('Gift Error', 'You do not have enough diamonds to send this gift (Cost: 2 diamonds).');
      }
    });

    socket.on('active_users_count', (data) => {
      setActiveUsers(data.count);
    });

    socket.on('match_error', (data) => {
      setStage('hub');
      endCall();
      if (data.reason === 'insufficient_diamonds') {
        Alert.alert('Not enough diamonds', 'You need at least 5 diamonds to match specifically with Women. Buy more diamonds in your profile!');
      } else {
        Alert.alert('Match Error', 'Failed to find a match.');
      }
    });

    socket.on('peer_left', () => {
      endCall();
      setStage('hub');
    });

    return () => {
      socket.off('match_found');
      socket.off('match_error');
      socket.off('peer_left');
      socket.off('receive_gift');
      socket.off('gift_error');
      socket.off('active_users_count');
    };
  }, []);

  // Pulse Animation
  useEffect(() => {
    const createPulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 3000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );
    createPulse(pulseAnim1, 0).start();
    createPulse(pulseAnim2, 800).start();
    createPulse(pulseAnim3, 1600).start();
  }, []);

  // Radar Animation
  useEffect(() => {
    if (stage === 'queue') {
      Animated.loop(
        Animated.timing(radarAnim, {
          toValue: 1,
          duration: 2200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      radarAnim.setValue(0);
    }
  }, [stage]);

  const enterQueue = async () => {
    const userStr = await AsyncStorage.getItem('user');
    if (!userStr) {
      Alert.alert('Error', 'Please log in first.');
      return;
    }
    const user = JSON.parse(userStr);

    setStage('queue');
    setReported(false);
    
    // Request Camera & Mic
    await initLocalStream();

    // Tell server to find a match
    socketService.socket?.emit('join_queue', {
      userId: user._id,
      gender: user.gender,
      filterGender: gender,
    });
  };

  const cancelQueue = () => {
    socketService.socket?.emit('leave_queue');
    endCall();
    setStage('hub');
  };

  useEffect(() => {
    if (!cooldown) return;
    const timer = setInterval(() => setCooldown((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const nextMatch = () => {
    if (cooldown) return;
    const now = Date.now();
    skipTimes.current = [...skipTimes.current.filter((t) => now - t < 15_000), now];
    if (skipTimes.current.length >= 5) {
      setCooldown(5);
      skipTimes.current = [];
    }
    
    endCall();
    setMuted(false);
    setCameraOff(false);
    setChatOpen(false);
    enterQueue();
  };

  const submitReport = async () => {
    setReportOpen(false);
    setReported(true);
    
    // Send report to server
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr && currentTargetUserId.current) {
        const user = JSON.parse(userStr);
        await fetch(`${API_BASE_URL}/api/moderation/report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reporterId: user._id,
            reportedUserId: currentTargetUserId.current,
            reason: reason
          })
        });
      }
    } catch (e) {
      console.error('Failed to submit report', e);
    }
    
    endCall();
    setIcebreaker(null);
    setTimeout(() => {
      setStage('hub');
      setReported(false);
    }, 1200);
  };

  const sendGift = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr && currentTargetSocket.current) {
         const user = JSON.parse(userStr);
         socketService.socket?.emit('send_gift', {
            senderId: user._id,
            targetSocketId: currentTargetSocket.current,
            giftType: 'rose'
         });
         // Optimistically show animation to sender too
         setGiftReceived('rose_sent');
         setTimeout(() => setGiftReceived(null), 1000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMute = () => {
    toggleMute();
    setMuted(!muted);
  };

  const handleCameraFlip = () => {
    toggleCamera();
  };


  // ===================== QUEUE SCREEN =====================
  if (stage === 'queue') {
    const radarSpin = radarAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    return (
      <ImageBackground source={matchBg} style={[styles.flex1, styles.bgMain]} blurRadius={5}>
        <SafeAreaView style={styles.flex1}>
          <View style={[styles.queueScreen, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
          <View style={styles.queueTop}>
            <Text style={styles.queueBrand}>VYBE</Text>
            <View style={styles.onlinePill}>
              <View style={styles.statusDot} />
              <Text style={styles.onlineText}>Live Queue</Text>
            </View>
          </View>

          <View style={styles.queueCenter}>
            <View style={styles.radar}>
              <View style={[styles.radarCircle, styles.radarCircle1]} />
              <View style={[styles.radarCircle, styles.radarCircle2]} />
              <View style={[styles.radarCircle, styles.radarCircle3]} />
              <Animated.View
                style={[styles.radarSweep, { transform: [{ rotate: radarSpin }] }]}
              />
              <View style={styles.radarCore}>
                <User size={28} color={colors.foreground} />
              </View>
            </View>
            <Text style={styles.queueTitle}>Finding your vybe</Text>
            <Text style={styles.queueSub}>
              Searching for someone{' '}
              {region === 'Local' ? 'close to you' : 'new around the world'}...
            </Text>
          </View>

          <Button
            variant="secondary"
            onPress={cancelQueue}
            style={styles.cancelBtn}
          >
            <X size={18} color={colors.foreground} />
            <Text style={styles.cancelText}>Cancel search</Text>
          </Button>
        </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  // ===================== CALL SCREEN =====================
  if (stage === 'call') {
    return (
      <View style={[styles.flex1, styles.bgMain]}>
        {/* Remote Video Feed */}
        {remoteStream && !reported ? (
          <RTCView
            streamURL={remoteStream.toURL()}
            style={styles.remoteFeed}
            objectFit="cover"
          />
        ) : (
          <View style={[styles.remoteFeed, { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }]}>
            {!reported && <Loader size={48} color={colors.primary} />}
          </View>
        )}
        
        <View style={styles.callShade} />

        {reported && !reportOpen && (
          <View style={styles.callBlackout}>
            <View style={styles.reportedMsg}>
              <ShieldAlert size={32} color={colors.destructive} />
              <Text style={styles.reportedTitle}>Session ended safely</Text>
              <Text style={styles.reportedSub}>You won't be matched again.</Text>
            </View>
          </View>
        )}

        {!reported && (
          <>
            <SafeAreaView style={styles.callTop}>
              <View style={styles.connectedPill}>
                <View style={styles.statusDot} />
                <Text style={styles.connectedText}>Connected</Text>
              </View>
              <View style={styles.pip}>
                {localStream && !cameraOff ? (
                  <RTCView 
                    streamURL={localStream.toURL()} 
                    style={{ width: '100%', height: '100%' }} 
                    objectFit="cover"
                    mirror={true}
                  />
                ) : (
                  <View style={styles.pipInner}>
                    <VideoOff size={24} color={colors.mutedForeground} />
                    <Text style={styles.pipLabel}>You</Text>
                  </View>
                )}
              </View>
            </SafeAreaView>

            <View style={styles.callPerson}>
              <Text style={styles.callName}>Stranger</Text>
              <View style={styles.callLocation}>
                <MapPin size={14} color="rgba(255,255,255,0.78)" />
                <Text style={styles.callLocationText}>{region}</Text>
              </View>
            </View>

            {chatOpen && (
              <View style={styles.chatOverlay}>
                <TextInput
                  style={styles.chatInput}
                  placeholder="Say something nice..."
                  placeholderTextColor={colors.mutedForeground}
                />
                <Button variant="default" size="icon" style={{ borderRadius: radii.full }}>
                  <Send size={16} color={colors.primaryForeground} />
                </Button>
              </View>
            )}

            {icebreaker && !chatOpen && (
              <View style={styles.icebreakerCard}>
                <Text style={styles.icebreakerTitle}>Icebreaker</Text>
                <Text style={styles.icebreakerText}>{icebreaker}</Text>
              </View>
            )}

            {giftReceived && (
               <View style={styles.giftOverlay}>
                 <Heart size={80} color={colors.primary} fill={colors.primary} />
                 <Text style={styles.giftText}>{giftReceived === 'rose_sent' ? 'Sent a Rose!' : 'Received a Rose!'}</Text>
               </View>
            )}

            <SafeAreaView style={styles.callControlsWrap} edges={['bottom']}>
              <View style={styles.callControls}>
                <TouchableOpacity
                  style={[styles.controlBtn, muted && styles.controlActive]}
                  onPress={handleMute}
                >
                  {muted ? (
                    <MicOff size={22} color={muted ? colors.background : colors.foreground} />
                  ) : (
                    <Mic size={22} color={colors.foreground} />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.controlBtn}
                  onPress={handleCameraFlip}
                >
                  <RefreshCw size={22} color={colors.foreground} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.controlBtn, styles.nextBtn]}
                  onPress={nextMatch}
                  disabled={cooldown > 0}
                >
                  {cooldown ? (
                    <Text style={styles.cooldownText}>{cooldown}</Text>
                  ) : (
                    <Sparkles size={28} color={colors.primaryForeground} />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.controlBtn}
                  onPress={sendGift}
                >
                  <Heart size={22} color={colors.foreground} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.controlBtn, chatOpen && styles.controlActive]}
                  onPress={() => setChatOpen(!chatOpen)}
                >
                  <MessageCircle
                    size={22}
                    color={chatOpen ? colors.background : colors.foreground}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.controlBtn, styles.reportBtn]}
                  onPress={() => { setReportOpen(true); }}
                >
                  <Flag size={22} color={colors.destructive} />
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </>
        )}

        {/* Report Modal */}
        <Modal visible={reportOpen} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Report this person</Text>
              <Text style={styles.modalDesc}>
                The video is hidden and the connection is paused. Choose a reason to
                help keep VYBE safe.
              </Text>
              <View style={styles.reasonGrid}>
                {reasons.map((item) => (
                  <TouchableOpacity
                    key={item.value}
                    style={[
                      styles.reasonBtn,
                      reason === item.value && styles.reasonSelected,
                    ]}
                    onPress={() => setReason(item.value)}
                  >
                    <Text
                      style={[
                         styles.reasonText,
                         reason === item.value && styles.reasonTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.modalFooter}>
                <Button
                  variant="secondary"
                  onPress={() => { setReportOpen(false); }}
                  style={{ flex: 1 }}
                >
                  Go back
                </Button>
                <Button
                  variant="destructive"
                  onPress={submitReport}
                  style={{ flex: 1 }}
                >
                  <ShieldAlert size={16} color={colors.destructiveForeground} />
                  <Text style={{ color: colors.destructiveForeground, fontWeight: '600' }}>
                    Report & block
                  </Text>
                </Button>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ===================== HUB SCREEN =====================
  const pulseStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 0] }),
    transform: [
      {
        scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] }),
      },
    ],
  });

  return (
    <SafeAreaView style={[styles.flex1, styles.bgMain]}>
      <TopBar />

      {/* Filters */}
      <View style={styles.filterPanel}>
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => setRegion(region === 'Global' ? 'Local' : 'Global')}
        >
          {region === 'Global' ? (
            <Globe size={16} color={colors.mutedForeground} />
          ) : (
            <MapPin size={16} color={colors.mutedForeground} />
          )}
          <Text style={styles.filterText}>{region}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => {
            const opts = ['Everyone', 'Women', 'Men'];
            const idx = opts.indexOf(gender);
            setGender(opts[(idx + 1) % opts.length]);
          }}
        >
          <Text style={styles.filterText}>{gender}</Text>
          <ChevronDown size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Match Stage */}
      <View style={styles.matchStage}>
        <View style={styles.pulseField}>
          <Animated.View style={[styles.pulseRing, pulseStyle(pulseAnim1)]} />
          <Animated.View
            style={[styles.pulseRing, { top: 24, left: 24, right: 24, bottom: 24 }, pulseStyle(pulseAnim2)]}
          />
          <Animated.View
            style={[styles.pulseRing, { top: 48, left: 48, right: 48, bottom: 48 }, pulseStyle(pulseAnim3)]}
          />
          <TouchableOpacity style={styles.matchButton} onPress={enterQueue} activeOpacity={0.85}>
            <Loader size={24} color={colors.primaryForeground} />
            <Text style={styles.matchBtnTitle}>Tap to match</Text>
            <Text style={styles.matchBtnSub}>
              {region} · {gender}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.onlinePill, { marginTop: 22 }]}>
          <View style={styles.statusDot} />
          <Text style={styles.onlineText}>{activeUsers > 0 ? activeUsers.toLocaleString() : '...'} people online now</Text>
        </View>

        <Text style={styles.kindnessNote}>
          Be kind. Conversations are random, but respect is not.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  bgMain: { backgroundColor: colors.background },

  // ---- Filters ----
  filterPanel: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 24,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
  },
  filterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.secondary,
  },
  filterText: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: '600',
  },

  // ---- Match Stage ----
  matchStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  pulseField: {
    width: 272,
    height: 272,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.33)',
    borderRadius: 9999,
  },
  matchButton: {
    width: 152,
    height: 152,
    borderRadius: 76,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.38,
    shadowRadius: 35,
    elevation: 12,
  },
  matchBtnTitle: {
    marginTop: 10,
    fontSize: 20,
    fontWeight: '800',
    color: colors.primaryForeground,
  },
  matchBtnSub: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.72)',
  },

  // ---- Online Pill ----
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.success,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  onlineText: {
    color: colors.mutedForeground,
    fontSize: 12,
    fontWeight: '600',
  },
  kindnessNote: {
    marginTop: 28,
    maxWidth: 260,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 20,
    color: colors.mutedForeground,
  },

  // ---- Queue ----
  queueScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 44,
  },
  queueTop: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  queueBrand: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
  },
  queueCenter: {
    alignItems: 'center',
  },
  radar: {
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarCircle: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.32)',
    borderRadius: 9999,
  },
  radarCircle1: { top: 0, left: 0, right: 0, bottom: 0 },
  radarCircle2: { top: 38, left: 38, right: 38, bottom: 38 },
  radarCircle3: { top: 76, left: 76, right: 76, bottom: 76 },
  radarSweep: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 9999,
  },
  radarCore: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 21,
    elevation: 10,
  },
  queueTitle: {
    marginTop: 32,
    fontSize: 32,
    fontWeight: '700',
    color: colors.foreground,
  },
  queueSub: {
    marginTop: 12,
    maxWidth: 280,
    textAlign: 'center',
    color: colors.mutedForeground,
    fontSize: 15,
  },
  cancelBtn: {
    width: '100%',
    height: 48,
    borderRadius: radii.full,
  },
  cancelText: {
    color: colors.foreground,
    fontWeight: '600',
    fontSize: 15,
  },

  // ---- Call ----
  remoteFeed: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  feedBlur: {
    transform: [{ scale: 1.1 }],
  },
  callShade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  callBlackout: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  reportedMsg: {
    alignItems: 'center',
  },
  reportedTitle: {
    marginTop: 12,
    fontWeight: '700',
    color: colors.foreground,
    fontSize: 16,
  },
  reportedSub: {
    marginTop: 4,
    color: colors.mutedForeground,
    fontSize: 14,
  },
  callTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 10,
    zIndex: 4,
  },
  connectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 34,
    borderRadius: radii.full,
    paddingHorizontal: 12,
    backgroundColor: colors.overlay,
  },
  connectedText: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: '700',
  },
  pip: {
    width: 96,
    aspectRatio: 3 / 4,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.76)',
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceHigh,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  pipInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
  },
  pipLabel: {
    fontSize: 10,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  callPerson: {
    position: 'absolute',
    left: 24,
    bottom: 180,
    zIndex: 4,
  },
  callName: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.foreground,
  },
  callLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  callLocationText: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
  },
  chatOverlay: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 116,
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderRadius: radii.lg,
    backgroundColor: colors.overlay,
    zIndex: 4,
  },
  chatInput: {
    flex: 1,
    color: colors.foreground,
    paddingHorizontal: 8,
    fontSize: 14,
  },
  callControlsWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 5,
  },
  icebreakerCard: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.85)',
    padding: 16,
    borderRadius: radii.lg,
    zIndex: 4,
  },
  icebreakerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  icebreakerText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  giftOverlay: {
    position: 'absolute',
    top: '30%',
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  giftText: {
    marginTop: 10,
    fontSize: 20,
    fontWeight: '800',
    color: 'white',
    textShadowColor: 'black',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  callControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  controlBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlay,
  },
  controlActive: {
    backgroundColor: colors.foreground,
    borderColor: colors.foreground,
  },
  nextBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  cooldownText: {
    color: colors.primaryForeground,
    fontSize: 24,
    fontWeight: '800',
  },
  reportBtn: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderColor: 'rgba(239,68,68,0.3)',
  },
  
  // ---- Modals ----
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 15,
    color: colors.mutedForeground,
    marginBottom: 24,
    lineHeight: 22,
  },
  reasonGrid: {
    gap: 8,
    marginBottom: 24,
  },
  reasonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  reasonSelected: {
    borderColor: colors.destructive,
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  reasonText: {
    fontSize: 15,
    color: colors.foreground,
    fontWeight: '500',
  },
  reasonTextSelected: {
    color: colors.destructive,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
});

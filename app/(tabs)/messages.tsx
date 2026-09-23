import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Flame,
  Laugh,
  Search,
  Send,
  Smile,
  Sparkles,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { colors, radii } from '../../src/theme/colors';
import { TopBar } from '../../src/components/AppShell';
import { Button } from '../../src/components/ui/Button';
import { socketService } from '../../src/integrations/socket';
import { API_BASE_URL } from '../../src/config';

const chatAvatar1 = require('../../assets/profile_girl_1.jpg');
const chatAvatar2 = require('../../assets/profile_girl_2.jpg');

export default function MessagesScreen() {
  const router = useRouter();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeChatName, setActiveChatName] = useState<string>('');
  const [messages, setMessages] = useState<any[]>([]);
  const [draft, setDraft] = useState('');
  const [people, setPeople] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const loadUserAndChats = async () => {
      try {
        const stored = await AsyncStorage.getItem('user');
        if (stored) {
          const u = JSON.parse(stored);
          setCurrentUser(u);
          
          socketService.connect();
          socketService.socket?.emit('register_user', u._id);

          const res = await fetch(`${API_BASE_URL}/api/messages/active-chats/${u._id}`);
          if (res.ok) {
            const data = await res.json();
            setPeople(data.chats);
          }
        }
      } catch (err) {
        console.error('Failed to load user or chats:', err);
      }
    };
    loadUserAndChats();
  }, []);

  useEffect(() => {
    if (!socketService.socket || !currentUser) return;

    const handleReceiveMessage = (data: any) => {
      // If the message is from the person we're currently chatting with
      if (activeChatId === data.senderId) {
        setMessages((prev) => [...prev, data]);
      } else {
        // Here we could update the unread count in the `people` list
      }
    };

    const handleMessageError = (data: any) => {
      if (data.reason === 'insufficient_diamonds') {
        Alert.alert('Out of Gems', 'You need at least 1 gem to send a message.', [{ text: 'OK' }]);
        // Rollback optimistic message update
        setMessages((prev) => prev.slice(0, -1));
      }
    };

    socketService.socket.on('receive_message', handleReceiveMessage);
    socketService.socket.on('message_error', handleMessageError);
    return () => {
      socketService.socket?.off('receive_message', handleReceiveMessage);
      socketService.socket?.off('message_error', handleMessageError);
    };
  }, [activeChatId, currentUser]);

  const loadHistory = async (otherUserId: string, otherUserName: string) => {
    setActiveChatId(otherUserId);
    setActiveChatName(otherUserName);
    if (!currentUser) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/messages/history/${currentUser._id}/${otherUserId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  };

  const send = () => {
    if (!draft.trim() || !activeChatId || !currentUser) return;
    const msgText = draft.trim();
    
    // Optimistic UI update
    setMessages((prev) => [...prev, { senderId: currentUser._id, text: msgText, createdAt: new Date() }]);
    
    socketService.socket?.emit('private_message', {
      senderId: currentUser._id,
      receiverId: activeChatId,
      text: msgText
    });
    
    setDraft('');
  };

  // ---- Chat Detail View ----
  if (activeChatId) {
    return (
      <SafeAreaView style={[styles.flex1, styles.bg]}>
        <View style={styles.chatHeader}>
          <Button variant="ghost" size="icon" onPress={() => setActiveChatId(null)} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.foreground} />
          </Button>
          <View style={styles.chatAvatar}>
            <Image source={chatPortraits} style={styles.avatarImg} />
          </View>
          <View>
            <Text style={styles.chatName}>{activeChatName}</Text>
            <Text style={styles.chatStatus}>Online</Text>
          </View>
        </View>

        <KeyboardAvoidingView
          style={styles.flex1}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={90}
        >
          <FlatList
            data={messages}
            keyExtractor={(item, i) => item._id || `${item.createdAt}-${i}`}
            contentContainerStyle={styles.messagesList}
            renderItem={({ item }) => {
              const isSentByMe = item.senderId === currentUser?._id;
              return (
                <View
                  style={[
                    styles.messageBubble,
                    isSentByMe ? styles.bubbleSent : styles.bubbleReceived,
                  ]}
                >
                  <Text style={styles.messageText}>{item.text}</Text>
                </View>
              );
            }}
          />

          <View style={styles.chatFooter}>
            <View style={styles.reactionRow}>
              {[
                <Smile key="s" size={20} color={colors.foreground} />,
                <Laugh key="l" size={20} color={colors.foreground} />,
                <Flame key="f" size={20} color={colors.foreground} />,
              ].map((icon, i) => (
                <Button key={i} variant="secondary" size="icon" style={styles.reactionBtn}>
                  {icon}
                </Button>
              ))}
            </View>
            <View style={styles.inputRow}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={send}
                placeholder="Type a message..."
                placeholderTextColor={colors.mutedForeground}
                style={styles.textInput}
                returnKeyType="send"
              />
              <Button size="icon" onPress={send} style={styles.sendBtn}>
                <Send size={16} color={colors.primaryForeground} />
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ---- Conversation List ----
  return (
    <SafeAreaView style={[styles.flex1, styles.bg]}>
      <TopBar />
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.sectionTag}>STAY IN TOUCH</Text>
            <Text style={styles.pageTitle}>Messages</Text>
          </View>
          <Button variant="secondary" size="icon" style={styles.searchBtn}>
            <Search size={18} color={colors.foreground} />
          </Button>
        </View>

        {/* Icebreaker Card */}
        <View style={styles.icebreakerCard}>
          <View style={styles.icebreakerTop}>
            <View style={styles.icebreakerIcon}>
              <Sparkles size={16} color={colors.primaryForeground} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.icebreakerTitle}>Text-only match</Text>
              <Text style={styles.icebreakerDesc}>
                Break the ice before turning on your camera.
              </Text>
            </View>
          </View>
          <Button
            onPress={() => router.push('/')}
            style={styles.findChatBtn}
          >
            Find a chat
          </Button>
        </View>

        {/* Active Matches */}
        <Text style={styles.sectionLabel}>Active matches</Text>
        {people.length === 0 ? (
          <Text style={{ color: colors.mutedForeground, marginTop: 12 }}>No active chats yet. Start matching!</Text>
        ) : (
          people.map((person, index) => (
            <TouchableOpacity
              key={person._id}
              style={styles.conversation}
              onPress={() => loadHistory(person._id, person.username)}
              activeOpacity={0.7}
            >
              <View style={styles.convoAvatar}>
                <Image source={index % 2 === 0 ? chatAvatar1 : chatAvatar2} style={styles.convoAvatarImg} />
              </View>
              <View style={styles.convoContent}>
                <Text style={styles.convoName}>{person.username}</Text>
                <Text style={styles.convoMsg} numberOfLines={1}>
                  Tap to view conversation
                </Text>
              </View>
              <View style={styles.convoMeta}>
                <Text style={styles.convoTime}>Now</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  bg: { backgroundColor: colors.background },
  content: { paddingHorizontal: 24, paddingBottom: 112 },

  // ---- Header ----
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  sectionTag: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  pageTitle: {
    marginTop: 4,
    fontSize: 32,
    fontWeight: '700',
    color: colors.foreground,
  },
  searchBtn: { borderRadius: radii.full },

  // ---- Icebreaker ----
  icebreakerCard: {
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.30)',
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    marginBottom: 28,
  },
  icebreakerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  icebreakerIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icebreakerTitle: {
    fontWeight: '700',
    color: colors.foreground,
    fontSize: 15,
  },
  icebreakerDesc: {
    marginTop: 4,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  findChatBtn: {
    marginTop: 20,
    height: 44,
    borderRadius: radii.full,
  },

  // ---- Section Label ----
  sectionLabel: {
    marginBottom: 12,
    color: colors.mutedForeground,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // ---- Conversation Row ----
  conversation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  convoAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  convoAvatarImg: {
    width: 54,
    height: 54,
    resizeMode: 'cover',
  },
  convoContent: { flex: 1 },
  convoName: {
    fontWeight: '700',
    color: colors.foreground,
    fontSize: 15,
  },
  convoMsg: {
    marginTop: 2,
    color: colors.mutedForeground,
    fontSize: 13,
  },
  convoMeta: {
    alignItems: 'flex-end',
    gap: 6,
  },
  convoTime: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryForeground,
  },

  // ---- Chat Detail ----
  chatHeader: {
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { borderRadius: radii.full },
  chatAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  avatarImg: {
    width: 40,
    height: 40,
    resizeMode: 'cover',
  },
  chatName: {
    fontWeight: '700',
    color: colors.foreground,
    fontSize: 15,
  },
  chatStatus: {
    fontSize: 12,
    color: colors.success,
  },
  messagesList: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bubbleSent: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  bubbleReceived: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
  },
  messageText: {
    color: colors.foreground,
    fontSize: 14,
    lineHeight: 20,
  },
  chatFooter: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  reactionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  reactionBtn: { borderRadius: radii.full },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    padding: 8,
  },
  textInput: {
    flex: 1,
    color: colors.foreground,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  sendBtn: { borderRadius: radii.full },
});

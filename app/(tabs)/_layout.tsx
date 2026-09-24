import { Tabs } from 'expo-router';
import { Smile, MessageCircle, User } from 'lucide-react-native';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../src/theme/colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Smile size={28} color={color} strokeWidth={2.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <View>
              <MessageCircle size={28} color={color} strokeWidth={2.5} />
              <View style={tabStyles.badge} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <User size={28} color={color} strokeWidth={2.5} />
          ),
        }}
      />
    </Tabs>
  );
}

const tabStyles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: -3,
    top: -2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.destructive,
  },
});

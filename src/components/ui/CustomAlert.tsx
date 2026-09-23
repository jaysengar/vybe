import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { colors, radii } from '../../../src/theme/colors';
import { Button } from './Button';

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  primaryButtonText?: string;
  onPrimaryPress?: () => void;
  secondaryButtonText?: string;
  onSecondaryPress?: () => void;
  isDestructive?: boolean;
}

export function CustomAlert({
  visible,
  title,
  message,
  primaryButtonText = 'OK',
  onPrimaryPress,
  secondaryButtonText,
  onSecondaryPress,
  isDestructive = false,
}: CustomAlertProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onSecondaryPress || onPrimaryPress}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalMessage}>{message}</Text>
          
          <View style={styles.buttonContainer}>
            {secondaryButtonText && (
              <Button
                variant="secondary"
                onPress={onSecondaryPress}
                style={[styles.button, styles.secondaryButton]}
              >
                {secondaryButtonText}
              </Button>
            )}
            <Button
              variant={isDestructive ? 'destructive' : 'default'}
              onPress={onPrimaryPress}
              style={styles.button}
            >
              {primaryButtonText}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.15)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: colors.mutedForeground,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
  },
  secondaryButton: {
    backgroundColor: colors.muted,
  },
});

import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use your computer's local IP address if testing on a physical device, 
// or localhost/10.0.2.2 if testing on iOS Simulator/Android Emulator.
// We'll use localhost for now.
const SOCKET_URL = 'https://vybe-backend-1uz9.onrender.com';

class SocketService {
  public socket: Socket | null = null;

  async connect() {
    if (!this.socket) {
      const token = await AsyncStorage.getItem('token');
      this.socket = io(SOCKET_URL, {
        transports: ['websocket'],
        auth: { token }
      });

      this.socket.on('connect', () => {
        console.log('[Socket] Connected with ID:', this.socket?.id);
      });

      this.socket.on('connect_error', (err) => {
        console.log('[Socket] Connect Error:', err.message);
      });

      this.socket.on('disconnect', () => {
        console.log('[Socket] Disconnected');
      });
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();

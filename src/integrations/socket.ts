import { io, Socket } from 'socket.io-client';

// Use your computer's local IP address if testing on a physical device, 
// or localhost/10.0.2.2 if testing on iOS Simulator/Android Emulator.
// We'll use localhost for now.
const SOCKET_URL = 'https://vybe-backend-1uz9.onrender.com';

class SocketService {
  public socket: Socket | null = null;

  connect() {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        transports: ['websocket'],
      });

      this.socket.on('connect', () => {
        console.log('[Socket] Connected with ID:', this.socket?.id);
      });

      this.socket.on('disconnect', () => {
        console.log('[Socket] Disconnected');
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();

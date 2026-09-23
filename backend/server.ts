import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import paymentRoutes from './routes/payments';
import moderationRoutes from './routes/moderation';
import messagesRoutes from './routes/messages';
import User from './models/User';
import Message from './models/Message';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vybedb';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('[VYBE] Successfully connected to MongoDB'))
  .catch((err) => console.error('[VYBE] MongoDB connection error:', err));

// CORS configuration is crucial for WebRTC and API requests from the mobile app
app.use(cors({
  origin: '*', // For development. In production, restrict this.
}));

app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/messages', messagesRoutes);

const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

// Basic route to check if server is running
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'VYBE Backend is running' });
});

import { processMatchPayment } from './services/matchmaker';

interface QueueUser {
  socketId: string;
  userId: string;
  gender: string;
  filterGender: string;
}

const icebreakers = [
  "If you had to eat one meal for the rest of your life, what would it be?",
  "What's the most controversial food opinion you have?",
  "If you could teleport anywhere right now, where would you go?",
  "What's your biggest pet peeve?",
  "What's a movie you can watch over and over without getting tired of it?",
  "If you won the lottery tomorrow, what's the first thing you would buy?",
  "What's the weirdest dream you've ever had?",
  "Cats or Dogs?"
];

let queue: QueueUser[] = [];
// Map userId -> socketId to enable direct messaging even when not matched
const userSockets = new Map<string, string>();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('register_user', (userId: string) => {
    userSockets.set(userId, socket.id);
  });

  const tryMatch = async () => {
    if (queue.length < 2) return;

    for (let i = 0; i < queue.length; i++) {
      for (let j = i + 1; j < queue.length; j++) {
        const userA = queue[i];
        const userB = queue[j];

        const aAcceptsB = userA.filterGender === 'Everyone' || userA.filterGender === userB.gender;
        const bAcceptsA = userB.filterGender === 'Everyone' || userB.filterGender === userA.gender;

        if (aAcceptsB && bAcceptsA) {
          queue.splice(j, 1);
          queue.splice(i, 1);

          const aPaid = await processMatchPayment(userA.userId, userA.filterGender);
          const bPaid = await processMatchPayment(userB.userId, userB.filterGender);

          if (aPaid && bPaid) {
            const randomIcebreaker = icebreakers[Math.floor(Math.random() * icebreakers.length)];

            io.to(userA.socketId).emit('match_found', { 
              targetSocketId: userB.socketId, 
              targetUserId: userB.userId,
              isInitiator: true,
              icebreaker: randomIcebreaker
            });
            io.to(userB.socketId).emit('match_found', { 
              targetSocketId: userA.socketId, 
              targetUserId: userA.userId,
              isInitiator: false,
              icebreaker: randomIcebreaker
            });
          } else {
            if (!aPaid) io.to(userA.socketId).emit('match_error', { reason: 'insufficient_diamonds' });
            if (!bPaid) io.to(userB.socketId).emit('match_error', { reason: 'insufficient_diamonds' });
          }
          return;
        }
      }
    }
  };

  socket.on('join_queue', (data) => {
    console.log(`User ${socket.id} joined queue with filters:`, data);
    queue = queue.filter(u => u.socketId !== socket.id); // Prevent duplicates
    queue.push({
      socketId: socket.id,
      userId: data.userId,
      gender: data.gender,
      filterGender: data.filterGender
    });
    tryMatch();
  });
  
  socket.on('leave_queue', () => {
    queue = queue.filter(u => u.socketId !== socket.id);
  });

  // WebRTC Signaling
  socket.on('webrtc_offer', (data) => {
    io.to(data.targetSocketId).emit('webrtc_offer', { sdp: data.sdp, senderSocketId: socket.id });
  });

  socket.on('webrtc_answer', (data) => {
    io.to(data.targetSocketId).emit('webrtc_answer', { sdp: data.sdp, senderSocketId: socket.id });
  });

  socket.on('webrtc_ice_candidate', (data) => {
    io.to(data.targetSocketId).emit('webrtc_ice_candidate', { candidate: data.candidate, senderSocketId: socket.id });
  });

  socket.on('leave_call', (data) => {
     if (data.targetSocketId) {
        io.to(data.targetSocketId).emit('peer_left');
     }
  });

  socket.on('send_gift', async (data) => {
     try {
       const sender = await User.findById(data.senderId);
       if (!sender) return;
       
       const cost = 2; // Fixed cost for a virtual gift
       if (sender.diamonds >= cost) {
         sender.diamonds -= cost;
         await sender.save();
         
         // Forward gift to the receiver
         io.to(data.targetSocketId).emit('receive_gift', { giftType: data.giftType });
       } else {
         socket.emit('gift_error', { reason: 'insufficient_diamonds' });
       }
     } catch (err) {
       console.error('Error sending gift:', err);
     }
  });

  socket.on('private_message', async (data) => {
    try {
      const { senderId, receiverId, text } = data;
      // Save to database
      const newMessage = new Message({ senderId, receiverId, text });
      await newMessage.save();

      // See if receiver is online to deliver real-time
      // We need a mapping from userId to socketId for this to work robustly.
      // For now, if they are still in the call, targetSocketId might be known,
      // but typically we'd look up receiverId in a userSockets map.
      if (userSockets.has(receiverId)) {
        const receiverSocketId = userSockets.get(receiverId);
        io.to(receiverSocketId).emit('receive_message', {
          senderId,
          text,
          createdAt: newMessage.createdAt
        });
      }
    } catch (err) {
      console.error('Error sending private message:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    queue = queue.filter(u => u.socketId !== socket.id);
    // Remove from userSockets map if we stored them
    for (const [userId, sId] of userSockets.entries()) {
      if (sId === socket.id) {
        userSockets.delete(userId);
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`[VYBE] Server listening on port ${PORT}`);
  console.log(`[VYBE] Socket.io ready for WebRTC Signaling`);
});

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
import Transaction from './models/Transaction';

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

import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_123';

// Socket Authentication Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) return next(new Error('Authentication error'));
    (socket as any).userId = decoded.userId;
    next();
  });
});

// Basic route to check if server is running
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'VYBE Backend is running' });
});

import { processMatchPayment } from './services/matchmaker';

import MatchQueue from './models/MatchQueue';

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

// Map userId -> socketId to enable direct messaging even when not matched
const userSockets = new Map<string, string>();

// Socket.io connection handling
io.on('connection', (socket) => {
  const userId = (socket as any).userId;
  console.log(`A user connected: ${socket.id} (User ID: ${userId})`);

  userSockets.set(userId, socket.id);

  // Broadcast active users count
  io.emit('active_users_count', { count: io.engine.clientsCount * 12 + 10000 }); // some mock large active pool calculation or real count

  const tryMatch = async (userIdToMatch: string) => {
    try {
      const userInQueue = await MatchQueue.findOne({ userId: userIdToMatch });
      if (!userInQueue) return;

      const user = await User.findById(userIdToMatch);
      if (!user) return;

      // Ensure user has some coordinates, else default to 0,0
      const coordinates = userInQueue.location?.coordinates || [0, 0];

      // Build gender filter query
      let genderQuery: any = {};
      
      // If user is looking for a specific gender, filter by that
      if (userInQueue.filterGender !== 'Everyone') {
        genderQuery.gender = userInQueue.filterGender;
      }

      // Find closest user that matches filters, hasn't skipped them, and they haven't skipped
      const potentialMatches = await MatchQueue.aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates },
            distanceField: "distance",
            spherical: true,
            maxDistance: 20000000 // 20,000km (basically earth radius to match anyone if needed)
          }
        },
        {
          $match: {
            userId: { $ne: new mongoose.Types.ObjectId(userIdToMatch) },
            ...genderQuery,
            skipped: { $ne: new mongoose.Types.ObjectId(userIdToMatch) }, // They haven't skipped me
            _id: { $nin: userInQueue.skipped } // I haven't skipped them
          }
        },
        { $limit: 1 }
      ]);

      if (potentialMatches.length > 0) {
        const match = potentialMatches[0];
        
        // Double check mutual acceptance: if the other person is NOT looking for 'Everyone', they must be looking for my gender
        if (match.filterGender !== 'Everyone' && match.filterGender !== userInQueue.gender) {
            return; // Mutual acceptance failed, we leave them in queue
        }

        // We found a match! Remove both from queue atomically
        const resA = await MatchQueue.findOneAndDelete({ userId: userInQueue.userId });
        const resB = await MatchQueue.findOneAndDelete({ userId: match.userId });

        if (resA && resB) {
          const aPaid = await processMatchPayment(userInQueue.userId.toString(), userInQueue.filterGender);
          const bPaid = await processMatchPayment(match.userId.toString(), match.filterGender);

          if (aPaid && bPaid) {
            const randomIcebreaker = icebreakers[Math.floor(Math.random() * icebreakers.length)];

            const aUser = await User.findById(userInQueue.userId);
            const bUser = await User.findById(match.userId);
            
            if (aUser && bUser) {
              aUser.pastMatches.push({ user: bUser._id as any, matchedAt: new Date() });
              bUser.pastMatches.push({ user: aUser._id as any, matchedAt: new Date() });
              await aUser.save();
              await bUser.save();
              
              io.to(userInQueue.socketId).emit('balance_update', { diamonds: aUser.diamonds });
              io.to(match.socketId).emit('balance_update', { diamonds: bUser.diamonds });
            }

            io.to(userInQueue.socketId).emit('match_found', { 
              targetSocketId: match.socketId, 
              targetUserId: match.userId.toString(),
              isInitiator: true,
              icebreaker: randomIcebreaker
            });
            io.to(match.socketId).emit('match_found', { 
              targetSocketId: userInQueue.socketId, 
              targetUserId: userInQueue.userId.toString(),
              isInitiator: false,
              icebreaker: randomIcebreaker
            });
          } else {
            if (!aPaid) io.to(userInQueue.socketId).emit('match_error', { reason: 'insufficient_diamonds' });
            if (!bPaid) io.to(match.socketId).emit('match_error', { reason: 'insufficient_diamonds' });
            
            // Put the innocent party back in the queue
            if (aPaid) {
                await MatchQueue.create({ ...match }); // Need proper re-insertion logic, simplified here
            }
            if (bPaid) {
                await MatchQueue.create({ ...userInQueue });
            }
          }
        }
      }
    } catch (err) {
      console.error('tryMatch Error:', err);
    }
  };

  socket.on('join_queue', async (data) => {
    console.log(`User ${socket.id} joined queue with filters:`, data);

    try {
      // 1. Verification check for Females
      const user = await User.findById(data.userId);
      if (user && user.gender === 'Female' && user.verificationStatus !== 'verified') {
        io.to(socket.id).emit('match_error', { reason: 'unverified_female' });
        return;
      }

      const coordinates = (data.lat && data.lon) ? [data.lon, data.lat] : [0, 0];

      // Update location in DB if provided
      if (user) {
        user.location = { type: 'Point', coordinates };
        await user.save();
      }

      // Upsert user into MatchQueue
      await MatchQueue.findOneAndUpdate(
        { userId: data.userId },
        {
          socketId: socket.id,
          gender: data.gender,
          filterGender: data.filterGender,
          location: { type: 'Point', coordinates },
          skipped: data.skipped || [],
          lastPingAt: new Date()
        },
        { upsert: true, new: true }
      );

      tryMatch(data.userId);
    } catch (err) {
      console.error('Error joining queue:', err);
    }
  });

  socket.on('queue_ping', async (data) => {
    try {
       await MatchQueue.findOneAndUpdate({ userId: data.userId }, { lastPingAt: new Date() });
    } catch (err) {
       console.error('Queue ping error', err);
    }
  });
  
  socket.on('skip_match', async (data) => {
    const { userId, targetUserId, gender, filterGender, lat, lon, skipped } = data;
    const newSkipped = [...(skipped || []), targetUserId];
    const coordinates = (lat && lon) ? [lon, lat] : [0, 0];
    
    try {
      await MatchQueue.findOneAndUpdate(
        { userId },
        {
          socketId: socket.id,
          gender,
          filterGender,
          location: { type: 'Point', coordinates },
          skipped: newSkipped,
          lastPingAt: new Date()
        },
        { upsert: true }
      );
      tryMatch(userId);
    } catch (err) {
       console.error('Error in skip_match:', err);
    }
  });

  socket.on('leave_queue', async () => {
    try {
      await MatchQueue.findOneAndDelete({ socketId: socket.id });
    } catch (err) {
      console.error(err);
    }
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
         
         await new Transaction({ userId: sender._id, type: 'spend', amount: cost, reason: 'sent_gift' }).save();

         socket.emit('balance_update', { diamonds: sender.diamonds });
         
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

      const sender = await User.findById(senderId);
      if (!sender) return;

      if (sender.diamonds < 1) {
        socket.emit('message_error', { reason: 'insufficient_diamonds' });
        return;
      }

      sender.diamonds -= 1;
      await sender.save();
      await new Transaction({ userId: sender._id, type: 'spend', amount: 1, reason: 'sent_message' }).save();
      socket.emit('balance_update', { diamonds: sender.diamonds });

      // Save to database
      const newMessage = new Message({ sender: senderId, receiver: receiverId, content: text });
      await newMessage.save();

      // See if receiver is online to deliver real-time
      if (userSockets.has(receiverId)) {
        const receiverSocketId = userSockets.get(receiverId);
        io.to(receiverSocketId).emit('receive_message', {
          sender: senderId,
          content: text,
          createdAt: newMessage.createdAt
        });
      }
    } catch (err) {
      console.error('Error sending private message:', err);
    }
  });

  socket.on('watch_ad', async (data) => {
    try {
      const user = await User.findById(data.userId);
      if (user) {
        user.diamonds += 1;
        await user.save();
        await new Transaction({ userId: user._id, type: 'earn', amount: 1, reason: 'watch_ad' }).save();
        socket.emit('balance_update', { diamonds: user.diamonds });
      }
    } catch (err) {
      console.error('Error in watch_ad:', err);
    }
  });

  socket.on('buy_gems', async (data) => {
    try {
      const user = await User.findById(data.userId);
      if (user) {
        user.diamonds += 50; // Add 50 gems for the mock purchase
        await user.save();
        await new Transaction({ userId: user._id, type: 'purchase', amount: 50, reason: 'buy_gems_mock' }).save();
        socket.emit('balance_update', { diamonds: user.diamonds });
      }
    } catch (err) {
      console.error('Error in buy_gems:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    io.emit('active_users_count', { count: io.engine.clientsCount * 12 + 10000 });
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

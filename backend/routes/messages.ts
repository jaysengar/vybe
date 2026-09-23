import express from 'express';
import Message from '../models/Message';
import User from '../models/User';

const router = express.Router();

// Get conversation history between two users
router.get('/history/:userId/:otherUserId', async (req, res) => {
  try {
    const { userId, otherUserId } = req.params;
    
    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId }
      ]
    }).sort({ createdAt: 1 }); // Oldest first

    res.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get list of active chats (people the user has messaged or received messages from)
router.get('/active-chats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find all distinct receivers where user is sender
    const sentTo = await Message.distinct('receiverId', { senderId: userId });
    // Find all distinct senders where user is receiver
    const receivedFrom = await Message.distinct('senderId', { receiverId: userId });
    
    const allChatPartnerIds = [...new Set([...sentTo, ...receivedFrom])];
    
    const chatPartners = await User.find({ _id: { $in: allChatPartnerIds } })
                                   .select('username age gender vip');

    res.json({ chats: chatPartners });
  } catch (error) {
    console.error('Error fetching active chats:', error);
    res.status(500).json({ error: 'Failed to fetch active chats' });
  }
});

export default router;

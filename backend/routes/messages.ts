import express from 'express';
import User from '../models/User';
import Message from '../models/Message';

const router = express.Router();

// Get past matches for a user
router.get('/matches/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).populate('pastMatches.user', 'username gender age isVip location');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return the matches (filtering out any nulls if users were deleted)
    const matches = user.pastMatches
      .filter(m => m.user != null)
      .map(m => {
        const otherUser = m.user as any;
        let distance = 'Unknown distance';
        if (user.location && user.location.lat && otherUser.location && otherUser.location.lat) {
          const R = 6371; 
          const dLat = (otherUser.location.lat - user.location.lat) * Math.PI / 180;
          const dLon = (otherUser.location.lon - user.location.lon) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(user.location.lat * Math.PI / 180) * Math.cos(otherUser.location.lat * Math.PI / 180) *
                    Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const km = Math.round(R * c);
          distance = `${km} km away`;
        }

        return {
          matchedAt: m.matchedAt,
          user: otherUser,
          distance
        };
      });

    res.json({ matches });
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get chat history between two users
router.get('/history/:userId/:targetId', async (req, res) => {
  try {
    const { userId, targetId } = req.params;
    
    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: targetId },
        { sender: targetId, receiver: userId }
      ]
    }).sort({ createdAt: 1 }); // Oldest to newest

    res.json({ messages });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

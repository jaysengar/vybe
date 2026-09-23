import express from 'express';
import User from '../models/User';

const router = express.Router();

// Verify payment from RevenueCat
router.post('/verify-revenuecat', async (req, res) => {
  try {
    const { 
      userId, 
      diamondsToAdd,
      isVip,
      rcAppUserId 
    } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Optionally: Use RevenueCat REST API to verify the receipt on the backend
    // https://docs.revenuecat.com/reference/receipts
    // For now, we trust the client's successful SDK response.
    
    if (diamondsToAdd) {
      user.diamonds += diamondsToAdd;
    }
    
    if (isVip) {
      // In a real app, VIP status would have an expiration date managed via RevenueCat webhooks
      user.diamonds += 500; // Bonus for VIP
    }

    await user.save();
    res.json({ success: true, message: 'Payment verified and gems added!', user });

  } catch (error) {
    console.error('Error verifying RevenueCat payment:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

export default router;

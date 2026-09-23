import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import User from '../models/User';

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'your_razorpay_key_here',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'your_razorpay_secret_here',
});

// Create an order for a specific diamond package
router.post('/create-order', async (req, res) => {
  try {
    const { amount, userId } = req.body; // Amount in INR (e.g., 99 for 100 diamonds)

    if (!amount || !userId) {
      return res.status(400).json({ error: 'Amount and User ID are required' });
    }

    const options = {
      amount: amount * 100, // Razorpay works in paise
      currency: 'INR',
      receipt: `receipt_order_${userId}_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Verify payment signature after client completes payment
router.post('/verify', async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature, 
      userId, 
      diamondsToAdd 
    } = req.body;

    const secret = process.env.RAZORPAY_KEY_SECRET || 'your_razorpay_secret_here';

    // Verify signature
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generated_signature = hmac.digest('hex');

    if (generated_signature === razorpay_signature) {
      // Payment is legit! Add diamonds to the user
      const user = await User.findById(userId);
      if (user) {
        user.diamonds += diamondsToAdd;
        await user.save();
        res.json({ success: true, message: 'Payment verified and diamonds added!', user });
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    } else {
      res.status(400).json({ error: 'Invalid signature' });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

export default router;

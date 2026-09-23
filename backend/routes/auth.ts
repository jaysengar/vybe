import express from 'express';
import User from '../models/User';

const router = express.Router();

// Simple Login/Signup endpoint for MVP
router.post('/login', async (req, res) => {
  try {
    const { username, gender, age } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Check if user exists
    let user = await User.findOne({ username });

    if (user && (user as any).status === 'banned') {
       return res.status(403).json({ error: 'Your account has been banned due to policy violations.' });
    }

    if (!user) {
      // Create new user if they don't exist and we have gender/age
      if (!gender || !age) {
        return res.status(400).json({ error: 'Gender and age are required for new users' });
      }
      user = new User({ username, gender, age });
      await user.save();
    }

    res.json({ message: 'Login successful', user });
  } catch (error) {
    console.error('Auth Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user profile
router.get('/me/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete account
router.delete('/delete/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    // You would typically also delete their messages here
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

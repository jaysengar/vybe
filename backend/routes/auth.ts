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
      // Males are auto-verified (no incentive to fake), females need to pass liveness check
      const verificationStatus = gender === 'Male' ? 'verified' : 'unverified';
      user = new User({ username, gender, age, verificationStatus });
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

// Update profile preferences
router.put('/profile/:id', async (req, res) => {
  try {
    const { preferences } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { preferences } },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Profile updated', user });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify liveness via Photo upload (Mocking AWS Rekognition)
router.post('/verify-liveness', async (req, res) => {
  try {
    const { userId, photoBase64 } = req.body;
    
    if (!userId || !photoBase64) {
      return res.status(400).json({ error: 'User ID and Photo are required' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // [INTEGRATION POINT]: Here you would send `photoBase64` to AWS Rekognition or GCP Vision API
    // e.g. const aiResponse = await rekognition.detectFaces({ Image: { Bytes: buffer }, Attributes: ['ALL'] }).promise();
    // if (aiResponse.FaceDetails[0].Gender.Value === 'Female' && isLive(aiResponse)) { ... }
    
    // For MVP, we will MOCK the AI processing delay (2 seconds) and always approve
    setTimeout(async () => {
      user.verificationStatus = 'verified';
      await user.save();
      res.json({ success: true, message: 'Verified successfully', user });
    }, 2000);
    
  } catch (error) {
    console.error('Liveness Verification Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

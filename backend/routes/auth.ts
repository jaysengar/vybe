import express from 'express';
import User from '../models/User';
import { RekognitionClient, DetectFacesCommand } from '@aws-sdk/client-rekognition';

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

// Verify liveness via Photo upload (AWS Rekognition)
router.post('/verify-liveness', async (req, res) => {
  try {
    const { userId, photoBase64 } = req.body;
    
    if (!userId || !photoBase64) {
      return res.status(400).json({ error: 'User ID and Photo are required' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Ensure environment variables exist, otherwise fallback to mock for local testing
    const hasAwsKeys = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;

    if (!hasAwsKeys) {
      console.log('AWS Keys missing in .env. Falling back to MOCK verification.');
      setTimeout(async () => {
        user.verificationStatus = 'verified';
        await user.save();
        return res.json({ success: true, message: 'Verified (Mock Mode)', user });
      }, 2000);
      return;
    }

    // ACTUAL AWS REKOGNITION LOGIC
    // Remove the data URI prefix if it exists (e.g., "data:image/jpeg;base64,")
    const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const client = new RekognitionClient({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
      }
    });

    const command = new DetectFacesCommand({
      Image: { Bytes: buffer },
      Attributes: ['ALL']
    });

    const response = await client.send(command);

    if (!response.FaceDetails || response.FaceDetails.length === 0) {
      return res.status(400).json({ error: 'No face detected in the image.' });
    }

    // Get the most prominent face
    const face = response.FaceDetails[0];

    // Check if Gender is Female and Confidence is high
    const isFemale = face.Gender?.Value === 'Female';
    const confidence = face.Gender?.Confidence || 0;

    if (isFemale && confidence > 80) {
      // Future enhancement: you can also check `face.Beard.Value === false` etc.
      user.verificationStatus = 'verified';
      await user.save();
      return res.json({ success: true, message: 'Verification successful', user });
    } else {
      user.verificationStatus = 'failed';
      await user.save();
      return res.status(400).json({ error: 'Verification failed. Our AI could not confirm female gender.' });
    }
    
  } catch (error) {
    console.error('Liveness Verification Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

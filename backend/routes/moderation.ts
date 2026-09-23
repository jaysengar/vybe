import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import Report from '../models/Report';

const router = express.Router();

// Report and Block a user
router.post('/report', async (req, res) => {
  try {
    const { reporterId, reportedUserId, reason } = req.body;

    if (!reporterId || !reportedUserId || !reason) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const reporter = await User.findById(reporterId);
    const reported = await User.findById(reportedUserId);

    if (!reporter || !reported) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Add to reporter's blocklist if not already there
    if (!reporter.blockedUsers.includes(reported._id)) {
      reporter.blockedUsers.push(reported._id);
      await reporter.save();
    }

    // Save report to database
    const report = new Report({
      reporterId,
      reportedUserId,
      reason
    });
    await report.save();

    console.log(`[Moderation] User ${reporterId} reported ${reportedUserId} for ${reason}`);

    res.json({ success: true, message: 'User reported and blocked successfully.' });
  } catch (error) {
    console.error('Error reporting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin Route: Get all reports
router.get('/admin/reports', async (req, res) => {
  try {
    const reports = await Report.find()
      .populate('reporterId', 'username age')
      .populate('reportedUserId', 'username age status')
      .sort({ createdAt: -1 });
    res.json({ reports });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin Route: Ban a user
router.post('/admin/ban', async (req, res) => {
  try {
    const { userId, reason } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // In a real app we'd have a 'status' or 'isBanned' field on User model
    // Let's assume we can set status = 'banned'
    (user as any).status = 'banned'; 
    await user.save();

    // Mark related reports as resolved
    await Report.updateMany({ reportedUserId: userId }, { status: 'resolved' });

    res.json({ success: true, message: 'User has been banned.' });
  } catch (error) {
    console.error('Error banning user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

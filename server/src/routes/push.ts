import express from 'express';
import pool from '../db/connection.js';

const router = express.Router();

router.post('/subscribe', async (req, res) => {
  const { profileId, subscription } = req.body;

  if (!profileId || !subscription || !subscription.endpoint || !subscription.keys) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { endpoint, keys } = subscription;
    
    // Insert or update the subscription for this endpoint
    await pool.query(
      `INSERT INTO push_subscriptions (profile_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (profile_id, endpoint) DO UPDATE 
       SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
      [profileId, endpoint, keys.p256dh, keys.auth]
    );

    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

router.post('/unsubscribe', async (req, res) => {
  const { profileId, endpoint } = req.body;

  if (!profileId || !endpoint) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    await pool.query(
      'DELETE FROM push_subscriptions WHERE profile_id = $1 AND endpoint = $2',
      [profileId, endpoint]
    );
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting push subscription:', error);
    res.status(500).json({ error: 'Failed to delete subscription' });
  }
});

export default router;

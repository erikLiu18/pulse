import express from 'express';
import pool from '../db/connection.js';
import webpush from 'web-push';

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

router.post('/test', async (req, res) => {
  const { profileId } = req.body;

  if (!profileId) {
    return res.status(400).json({ error: 'Missing profileId' });
  }

  try {
    // Get all subscriptions for this profile
    const { rows: subscriptions } = await pool.query(
      'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE profile_id = $1',
      [profileId]
    );

    if (subscriptions.length === 0) {
      return res.status(404).json({ error: 'No active push subscriptions found. Enable notifications in Settings first.' });
    }

    // Get the latest entry for this profile
    const { rows: latestEntries } = await pool.query(
      `SELECT e.*, s.name as subcategory_name
       FROM entries e
       JOIN subcategories s ON e.subcategory_id = s.id
       WHERE e.profile_id = $1
       ORDER BY e.date DESC, e.start_time DESC
       LIMIT 1`,
      [profileId]
    );

    let pushPayload;

    if (latestEntries.length > 0 && latestEntries[0].is_active) {
      const entry = latestEntries[0];
      pushPayload = {
        title: '🔔 Pulse Timer Active (Test)',
        body: `Are you still doing ${entry.subcategory_name}?`,
        url: '/',
        entryId: entry.id,
        actions: [
          { action: 'ignore', title: 'Yes' },
          { action: 'stop', title: 'No' }
        ]
      };
    } else {
      pushPayload = {
        title: '🔔 Time is ticking (Test)',
        body: 'What are you doing? Log your time.',
        url: '/'
      };
    }

    // Send to all registered devices for this profile
    await Promise.all(
      subscriptions.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(pushPayload)
        ).catch(err => console.error('Test push error:', err))
      )
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending test push:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

export default router;


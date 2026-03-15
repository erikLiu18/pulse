import cron from 'node-cron';
import webpush from 'web-push';
import pool from '../db/connection.js';

// Configure Web Push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:test@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn('VAPID keys not configured. Push notifications will not work.');
}

// Helper to check if current time is within quiet hours
function isInQuietHours(startStr: string | null | undefined, endStr: string | null | undefined): boolean {
  if (!startStr || !endStr) return false;

  const now = new Date();
  
  // Convert current time to local HH:MM assuming Pacific Time for now 
  // (In a real app, timezone should be user-configured or sent from client)
  // To keep logic simple, we'll parse the HH:MM strings and compare
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  const [startHour, startMinute] = startStr.split(':').map(Number);
  const [endHour, endMinute] = endStr.split(':').map(Number);

  const currentMins = currentHour * 60 + currentMinute;
  const startMins = startHour * 60 + startMinute;
  const endMins = endHour * 60 + endMinute;

  // If quiet hours span midnight (e.g. 23:00 to 08:00)
  if (startMins > endMins) {
    return currentMins >= startMins || currentMins <= endMins;
  } 
  // Normal range (e.g. 09:00 to 17:00)
  else {
    return currentMins >= startMins && currentMins <= endMins;
  }
}

export function startCronJobs() {
  console.log('Starting push notification cron job (runs every 5 minutes)...');

  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      // Get all active subscriptions
      const { rows: subscriptions } = await pool.query(`
        SELECT ps.id, ps.profile_id, ps.endpoint, ps.p256dh, ps.auth, 
               p.quiet_hours_start, p.quiet_hours_end, p.name as profile_name
        FROM push_subscriptions ps
        JOIN profiles p ON ps.profile_id = p.id
      `);

      if (subscriptions.length === 0) return;

      for (const sub of subscriptions) {
        // 1. Check if user is in quiet hours
        if (isInQuietHours(sub.quiet_hours_start, sub.quiet_hours_end)) {
          continue; // Skip silently
        }

        // 2. Fetch the latest entry for this profile
        const { rows: latestEntries } = await pool.query(
          `SELECT e.*, c.name as category_name, s.name as subcategory_name
           FROM entries e
           JOIN subcategories s ON e.subcategory_id = s.id
           JOIN categories c ON s.category_id = c.id
           WHERE e.profile_id = $1
           ORDER BY e.date DESC, e.start_time DESC
           LIMIT 1`,
          [sub.profile_id]
        );

        if (latestEntries.length === 0) continue;

        const latestEntry = latestEntries[0];
        
        // Create Date objects for comparison
        // start_time is "HH:mm" on date "YYYY-MM-DD" stored in user's LOCAL Pacific time.
        // Railway servers run in UTC, so we must append the Pacific offset (-07:00 for PDT)
        // to prevent the server from treating local times as UTC (which would be 7h off).
        // TODO: store user timezone in profile for proper multi-timezone support.
        const entryDateStr = typeof latestEntry.date === 'string' ? latestEntry.date.split('T')[0] : latestEntry.date.toISOString().split('T')[0];
        const pacificOffset = '-07:00'; // PDT (UTC-7). Change to -08:00 for PST (Nov-Mar).
        const localStartTimeString = `${entryDateStr}T${latestEntry.start_time}:00${pacificOffset}`;
        const entryStartTime = new Date(localStartTimeString);
        
        // Add duration to get end time
        const entryEndTime = new Date(entryStartTime.getTime() + latestEntry.duration_minutes * 60 * 1000);
        
        const now = new Date();
        const oneHourMs = 60 * 60 * 1000;

        // Notification schedule: 1h, 1.5h, 2.5h, 4.5h elapsed
        const targetElapsedMins = [60, 90, 150, 270];
        const targetElapsedMs = targetElapsedMins.map(m => m * 60 * 1000);
        const fiveMinsMs = 5 * 60 * 1000;

        let pushPayload = null;

        // Condition A: Active entry running too long
        if (latestEntry.is_active) {
          const timeSinceStart = now.getTime() - entryStartTime.getTime();
          const shouldNotify = targetElapsedMs.some(target => timeSinceStart >= target && timeSinceStart < target + fiveMinsMs);
          
          if (shouldNotify) {
            pushPayload = {
              title: "Pulse Timer Active",
              body: `Are you still doing ${latestEntry.subcategory_name}?`,
              url: "/",
              entryId: latestEntry.id,
              actions: [
                { action: "ignore", title: "Yes" },
                { action: "stop", title: "No" }
              ]
            };
          }
        } 
        // Condition B: Inactive entry
        else {
          const timeSinceEnd = now.getTime() - entryEndTime.getTime();
          const shouldNotify = targetElapsedMs.some(target => timeSinceEnd >= target && timeSinceEnd < target + fiveMinsMs);
          
          if (shouldNotify) {
            pushPayload = {
              title: "Time is ticking",
              body: "What are you doing? Log your time.",
              url: "/"
            };
          }
        }

        // 3. Send Notification if payload exists
        if (pushPayload) {
          try {
            const pushSubscription = {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            };
            
            await webpush.sendNotification(
              pushSubscription,
              JSON.stringify(pushPayload)
            );
            console.log(`Sent push notification to ${sub.profile_name}`);
          } catch (error: any) {
            // Unsubscribe if endpoint is no longer valid (e.g., user revoked permission on browser)
            if (error.statusCode === 410 || error.statusCode === 404) {
              await pool.query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]);
              console.log(`Removed invalid subscription for ${sub.profile_name}`);
            } else {
              console.error('Push error:', error);
            }
          }
        }
      }
    } catch (err) {
      console.error('Cron job error:', err);
    }
  });
}

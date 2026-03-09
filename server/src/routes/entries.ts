import { Router } from 'express';
import pool from '../db/connection.js';

const router = Router();

// Get entries for a profile on a date
router.get('/', async (req, res) => {
  const { profile_id, date } = req.query;
  if (!profile_id || !date) {
    res.status(400).json({ error: 'profile_id and date required' });
    return;
  }

  const { rows } = await pool.query(`
    SELECT e.*, s.name as subcategory_name, s.icon as subcategory_icon,
           c.name as category_name, c.color as category_color, c.icon as category_icon, c.id as category_id
    FROM entries e
    JOIN subcategories s ON e.subcategory_id = s.id
    JOIN categories c ON s.category_id = c.id
    WHERE e.profile_id = $1 AND e.date = $2
    ORDER BY e.start_time ASC NULLS LAST, e.created_at ASC
  `, [profile_id, date]);

  res.json(rows);
});

// Create entry
router.post('/', async (req, res) => {
  const { profile_id, subcategory_id, date, start_time, duration_minutes, tags, note, is_active } = req.body;

  if (!profile_id || !subcategory_id || !date) {
    res.status(400).json({ error: 'profile_id, subcategory_id, and date required' });
    return;
  }

  // Check for cross-midnight entries
  const startMins = start_time ? (() => { const [h, m] = start_time.split(':').map(Number); return h * 60 + m; })() : 0;
  const endMins = startMins + (duration_minutes || 15);

  if (endMins > 1440 && start_time) {
    // Crosses midnight — split into two entries
    const minutesBeforeMidnight = 1440 - startMins;
    const minutesAfterMidnight = endMins - 1440;

    // Entry 1: today, from start_time to midnight
    const { rows: rows1 } = await pool.query(
      `INSERT INTO entries (profile_id, subcategory_id, date, start_time, duration_minutes, tags, note, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [profile_id, subcategory_id, date, start_time, minutesBeforeMidnight, JSON.stringify(tags || []), note || null, false]
    );

    // Entry 2: next day, from 00:00 to remaining duration
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextDateStr = nextDate.toISOString().slice(0, 10);

    const { rows: rows2 } = await pool.query(
      `INSERT INTO entries (profile_id, subcategory_id, date, start_time, duration_minutes, tags, note, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [profile_id, subcategory_id, nextDateStr, '00:00', minutesAfterMidnight, JSON.stringify(tags || []), note ? `${note} (continued)` : '(continued from previous day)', false]
    );

    res.status(201).json({ entries: [rows1[0], rows2[0]], split: true });
    return;
  }

  const { rows } = await pool.query(
    `INSERT INTO entries (profile_id, subcategory_id, date, start_time, duration_minutes, tags, note, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [profile_id, subcategory_id, date, start_time || null, duration_minutes || 15, JSON.stringify(tags || []), note || null, is_active || false]
  );

  res.status(201).json(rows[0]);
});

// Finish an active entry (set is_active=false, finalize duration)
router.post('/:id/finish', async (req, res) => {
  const { id } = req.params;
  const entry = (await pool.query('SELECT * FROM entries WHERE id = $1', [id])).rows[0];
  if (!entry) { res.status(404).json({ error: 'Entry not found' }); return; }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = entry.start_time.split(':').map(Number);
  const startMinutes = sh * 60 + sm;
  let duration = currentMinutes - startMinutes;
  if (duration <= 0) duration += 1440;
  duration = Math.ceil(duration / 15) * 15; // Round up to 15 min
  if (duration < 15) duration = 15;

  const { rows } = await pool.query(
    'UPDATE entries SET is_active = false, duration_minutes = $1 WHERE id = $2 RETURNING *',
    [duration, id]
  );
  res.json(rows[0]);
});

// Update entry
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { subcategory_id, start_time, duration_minutes, tags, note } = req.body;

  const { rows } = await pool.query(`
    UPDATE entries SET
      subcategory_id = COALESCE($1, subcategory_id),
      start_time = COALESCE($2, start_time),
      duration_minutes = COALESCE($3, duration_minutes),
      tags = COALESCE($4, tags),
      note = COALESCE($5, note)
    WHERE id = $6 RETURNING *
  `, [subcategory_id, start_time, duration_minutes, tags ? JSON.stringify(tags) : null, note, id]);

  res.json(rows[0]);
});

// Delete entry
router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM entries WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

export default router;

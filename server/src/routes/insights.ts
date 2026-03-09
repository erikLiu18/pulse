import { Router } from 'express';
import pool from '../db/connection.js';

const router = Router();

// Get latest insight for a profile + week
router.get('/weekly', async (req, res) => {
  const { profile_id, start_date, end_date } = req.query;
  if (!profile_id || !start_date || !end_date) {
    res.status(400).json({ error: 'profile_id, start_date, and end_date required' });
    return;
  }
  const { rows } = await pool.query(
    `SELECT * FROM insights
     WHERE profile_id = $1 AND start_date = $2 AND end_date = $3
     ORDER BY generated_at DESC LIMIT 1`,
    [profile_id, start_date, end_date]
  );
  if (rows.length === 0) {
    res.json({ insight: null });
    return;
  }
  res.json({ insight: rows[0].content, generatedAt: rows[0].generated_at });
});

// Save a new insight (called by the CLI skill)
router.post('/weekly', async (req, res) => {
  const { profile_id, start_date, end_date, content } = req.body;
  if (!profile_id || !start_date || !end_date || !content) {
    res.status(400).json({ error: 'profile_id, start_date, end_date, and content required' });
    return;
  }
  const { rows } = await pool.query(
    `INSERT INTO insights (profile_id, start_date, end_date, content)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [profile_id, start_date, end_date, content]
  );
  res.status(201).json({ insight: rows[0].content, generatedAt: rows[0].generated_at });
});

export default router;

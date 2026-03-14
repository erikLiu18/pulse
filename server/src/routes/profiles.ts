import { Router } from 'express';
import pool from '../db/connection.js';

const router = Router();

router.get('/', async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM profiles ORDER BY id');
  res.json(rows);
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, avatar, quiet_hours_start, quiet_hours_end } = req.body;

  try {
    const result = await pool.query(
      `UPDATE profiles 
       SET 
        name = COALESCE($1, name), 
        avatar = COALESCE($2, avatar),
        quiet_hours_start = $3,
        quiet_hours_end = $4
       WHERE id = $5 
       RETURNING *`,
      [name, avatar, quiet_hours_start, quiet_hours_end, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;

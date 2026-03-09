import { Router } from 'express';
import pool from '../db/connection.js';

const router = Router();

// Daily breakdown by category
router.get('/daily', async (req, res) => {
  const { profile_id, date } = req.query;
  if (!profile_id || !date) {
    res.status(400).json({ error: 'profile_id and date required' });
    return;
  }

  const { rows: stats } = await pool.query(`
    SELECT c.id, c.name, c.color, c.icon,
           COALESCE(SUM(e.duration_minutes), 0)::int as total_minutes
    FROM categories c
    LEFT JOIN subcategories s ON s.category_id = c.id
    LEFT JOIN entries e ON e.subcategory_id = s.id AND e.profile_id = $1 AND e.date = $2
    GROUP BY c.id, c.name, c.color, c.icon, c.sort_order
    ORDER BY c.sort_order
  `, [profile_id, date]);

  // Calculate task minutes (sum of all durations, can exceed 1440 with parallel tasks)
  const tracked = stats.reduce((sum: number, s: any) => sum + s.total_minutes, 0);

  // Compute wall clock hours (unique minutes occupied, no double counting)
  const { rows: entries } = await pool.query(
    `SELECT start_time, duration_minutes FROM entries
     WHERE profile_id = $1 AND date = $2 AND start_time IS NOT NULL`,
    [profile_id, date]
  );

  // Build a bitmap of which 15-min slots are occupied
  const slots = new Set<number>();
  for (const e of entries) {
    const [h, m] = e.start_time.split(':').map(Number);
    const startSlot = Math.floor((h * 60 + m) / 15);
    const numSlots = Math.ceil(e.duration_minutes / 15);
    for (let s = 0; s < numSlots; s++) {
      slots.add(startSlot + s);
    }
  }
  const wallClockMinutes = slots.size * 15;
  const taskMinutes = tracked;

  // Unlabeled uses wall clock minutes to avoid negative values with parallel tasks
  const unlabeled = Math.max(0, 1440 - wallClockMinutes);
  const unlabeledCat = stats.find((s: any) => s.name === 'Unlabeled');
  if (unlabeledCat) {
    unlabeledCat.total_minutes = unlabeled;
  } else {
    stats.push({ id: 6, name: 'Unlabeled', color: '#9CA3AF', icon: '❓', total_minutes: unlabeled });
  }
  res.json({
    categories: stats,
    taskMinutes,
    wallClockMinutes,
    parallelMinutes: Math.max(0, taskMinutes - wallClockMinutes),
    multiplier: wallClockMinutes > 0 ? +(taskMinutes / wallClockMinutes).toFixed(2) : 1,
  });
});

// Weekly breakdown by category
router.get('/weekly', async (req, res) => {
  const { profile_id, start_date, end_date } = req.query;
  if (!profile_id || !start_date || !end_date) {
    res.status(400).json({ error: 'profile_id, start_date, and end_date required' });
    return;
  }

  const { rows: daily } = await pool.query(`
    SELECT e.date, c.id as category_id, c.name as category_name, c.color,
           SUM(e.duration_minutes)::int as total_minutes
    FROM entries e
    JOIN subcategories s ON e.subcategory_id = s.id
    JOIN categories c ON s.category_id = c.id
    WHERE e.profile_id = $1 AND e.date >= $2 AND e.date <= $3
    GROUP BY e.date, c.id, c.name, c.color, c.sort_order
    ORDER BY e.date, c.sort_order
  `, [profile_id, start_date, end_date]);

  const { rows: totals } = await pool.query(`
    SELECT c.id, c.name, c.color, c.icon,
           COALESCE(SUM(e.duration_minutes), 0)::int as total_minutes
    FROM categories c
    LEFT JOIN subcategories s ON s.category_id = c.id
    LEFT JOIN entries e ON e.subcategory_id = s.id
      AND e.profile_id = $1 AND e.date >= $2 AND e.date <= $3
    GROUP BY c.id, c.name, c.color, c.icon
    ORDER BY total_minutes DESC
  `, [profile_id, start_date, end_date]);

  // Compute wall clock hours per day for the week
  const { rows: allEntries } = await pool.query(
    `SELECT date, start_time, duration_minutes FROM entries
     WHERE profile_id = $1 AND date >= $2 AND date <= $3 AND start_time IS NOT NULL`,
    [profile_id, start_date, end_date]
  );

  // Group by date, compute wall clock per day
  const wallClockByDate = new Map<string, number>();
  const dateEntries = new Map<string, typeof allEntries>();
  for (const e of allEntries) {
    const d = typeof e.date === 'string' ? e.date.slice(0, 10) : new Date(e.date).toISOString().slice(0, 10);
    if (!dateEntries.has(d)) dateEntries.set(d, []);
    dateEntries.get(d)!.push(e);
  }
  for (const [d, dayEntries] of dateEntries) {
    const slots = new Set<number>();
    for (const e of dayEntries) {
      const [h, m] = e.start_time.split(':').map(Number);
      const startSlot = Math.floor((h * 60 + m) / 15);
      const numSlots = Math.ceil(e.duration_minutes / 15);
      for (let s = 0; s < numSlots; s++) slots.add(startSlot + s);
    }
    wallClockByDate.set(d, slots.size * 15);
  }

  const totalTaskMinutes = totals.reduce((s: number, t: any) => s + t.total_minutes, 0);
  const totalWallClockMinutes = Array.from(wallClockByDate.values()).reduce((s, v) => s + v, 0);

  res.json({
    daily,
    totals,
    taskMinutes: totalTaskMinutes,
    wallClockMinutes: totalWallClockMinutes,
    parallelMinutes: Math.max(0, totalTaskMinutes - totalWallClockMinutes),
    multiplier: totalWallClockMinutes > 0 ? +(totalTaskMinutes / totalWallClockMinutes).toFixed(2) : 1,
  });
});

export default router;

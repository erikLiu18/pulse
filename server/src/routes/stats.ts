import { Router } from 'express';
import db from '../db/connection.js';

const router = Router();

// Daily breakdown by category
router.get('/daily', (req, res) => {
  const { profile_id, date } = req.query;
  if (!profile_id || !date) {
    res.status(400).json({ error: 'profile_id and date required' });
    return;
  }

  const stats = db.prepare(`
    SELECT c.id, c.name, c.color, c.icon,
           COALESCE(SUM(e.duration_minutes), 0) as total_minutes
    FROM categories c
    LEFT JOIN subcategories s ON s.category_id = c.id
    LEFT JOIN entries e ON e.subcategory_id = s.id AND e.profile_id = ? AND e.date = ?
    GROUP BY c.id
    ORDER BY c.sort_order
  `).all(profile_id, date);

  // Calculate unlabeled time (24h = 1440 min minus tracked)
  const tracked = (stats as any[]).reduce((sum: number, s: any) => sum + s.total_minutes, 0);
  const unlabeled = Math.max(0, 1440 - tracked);
  // Add unlabeled to the stats array (find the Unlabeled category or append it)
  const result = stats as any[];
  const unlabeledCat = result.find((s: any) => s.name === 'Unlabeled');
  if (unlabeledCat) {
    unlabeledCat.total_minutes = unlabeled;
  } else {
    result.push({ id: 6, name: 'Unlabeled', color: '#9CA3AF', icon: '❓', total_minutes: unlabeled });
  }
  res.json(result);
});

// Weekly breakdown by category
router.get('/weekly', (req, res) => {
  const { profile_id, start_date, end_date } = req.query;
  if (!profile_id || !start_date || !end_date) {
    res.status(400).json({ error: 'profile_id, start_date, and end_date required' });
    return;
  }

  const daily = db.prepare(`
    SELECT e.date, c.id as category_id, c.name as category_name, c.color,
           SUM(e.duration_minutes) as total_minutes
    FROM entries e
    JOIN subcategories s ON e.subcategory_id = s.id
    JOIN categories c ON s.category_id = c.id
    WHERE e.profile_id = ? AND e.date >= ? AND e.date <= ?
    GROUP BY e.date, c.id
    ORDER BY e.date, c.sort_order
  `).all(profile_id, start_date, end_date);

  const totals = db.prepare(`
    SELECT c.id, c.name, c.color, c.icon,
           COALESCE(SUM(e.duration_minutes), 0) as total_minutes
    FROM categories c
    LEFT JOIN subcategories s ON s.category_id = c.id
    LEFT JOIN entries e ON e.subcategory_id = s.id
      AND e.profile_id = ? AND e.date >= ? AND e.date <= ?
    GROUP BY c.id
    ORDER BY total_minutes DESC
  `).all(profile_id, start_date, end_date);

  res.json({ daily, totals });
});

export default router;

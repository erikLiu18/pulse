import { Router } from 'express';
import db from '../db/connection.js';
import { generateWeeklyInsight } from '../services/ai.js';

const router = Router();

router.post('/weekly', async (req, res) => {
  try {
    const { profile_id, start_date, end_date } = req.body;

    if (!profile_id || !start_date || !end_date) {
      res.status(400).json({ error: 'profile_id, start_date, and end_date required' });
      return;
    }

    const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(profile_id) as any;
    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const totals = db.prepare(`
      SELECT c.name, COALESCE(SUM(e.duration_minutes), 0) as total_minutes
      FROM categories c
      LEFT JOIN subcategories s ON s.category_id = c.id
      LEFT JOIN entries e ON e.subcategory_id = s.id
        AND e.profile_id = ? AND e.date >= ? AND e.date <= ?
      GROUP BY c.id ORDER BY total_minutes DESC
    `).all(profile_id, start_date, end_date) as any[];

    const totalMinutes = totals.reduce((sum: number, t: any) => sum + t.total_minutes, 0);

    if (totalMinutes === 0) {
      res.json({ insight: 'No time entries recorded for this week. Start logging to get insights!', generatedAt: new Date().toISOString() });
      return;
    }

    const topSubs = db.prepare(`
      SELECT s.name, c.name as category, SUM(e.duration_minutes) as total_minutes
      FROM entries e
      JOIN subcategories s ON e.subcategory_id = s.id
      JOIN categories c ON s.category_id = c.id
      WHERE e.profile_id = ? AND e.date >= ? AND e.date <= ?
      GROUP BY s.id ORDER BY total_minutes DESC LIMIT 5
    `).all(profile_id, start_date, end_date) as any[];

    const insight = await generateWeeklyInsight({
      profileName: profile.name,
      weekLabel: `${start_date} to ${end_date}`,
      categoryBreakdown: totals.map((t: any) => ({
        name: t.name,
        hours: +(t.total_minutes / 60).toFixed(1),
        percentage: totalMinutes > 0 ? Math.round(t.total_minutes / totalMinutes * 100) : 0
      })),
      topSubcategories: topSubs.map((s: any) => ({
        name: s.name,
        category: s.category,
        hours: +(s.total_minutes / 60).toFixed(1)
      })),
      totalHours: +(totalMinutes / 60).toFixed(1)
    });

    res.json({ insight, generatedAt: new Date().toISOString() });
  } catch (error: any) {
    console.error('Insight generation failed:', error);
    res.status(500).json({ error: 'Failed to generate insight', details: error.message });
  }
});

export default router;

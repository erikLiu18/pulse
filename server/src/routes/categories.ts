import { Router } from 'express';
import pool from '../db/connection.js';

const router = Router();

router.get('/', async (_req, res) => {
  const { rows: categories } = await pool.query('SELECT * FROM categories ORDER BY sort_order');
  const { rows: subcategories } = await pool.query('SELECT * FROM subcategories ORDER BY id');
  const result = categories.map(cat => ({
    ...cat,
    subcategories: subcategories.filter(sub => sub.category_id === cat.id)
  }));
  res.json(result);
});

// Create a new category
router.post('/', async (req, res) => {
  const { name, color, icon, description } = req.body;
  if (!name || !color || !icon) {
    res.status(400).json({ error: 'name, color, and icon are required' });
    return;
  }
  const desc = description || `Activities related to ${name.toLowerCase()}`;
  const maxOrder = await pool.query('SELECT COALESCE(MAX(sort_order), 0) + 1 as next FROM categories');
  const { rows } = await pool.query(
    'INSERT INTO categories (name, color, icon, sort_order, description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [name, color, icon, maxOrder.rows[0].next, desc]
  );
  res.status(201).json({ ...rows[0], subcategories: [] });
});

// Update a category
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, color, icon, description } = req.body;
  if (!name || !color || !icon) {
    res.status(400).json({ error: 'name, color, and icon are required' });
    return;
  }
  if (description !== undefined) {
    await pool.query('UPDATE categories SET name = $1, color = $2, icon = $3, description = $4 WHERE id = $5', [name, color, icon, description, id]);
  } else {
    await pool.query('UPDATE categories SET name = $1, color = $2, icon = $3 WHERE id = $4', [name, color, icon, id]);
  }
  const { rows: catRows } = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);
  if (catRows.length === 0) { res.status(404).json({ error: 'Category not found' }); return; }
  const { rows: subRows } = await pool.query('SELECT * FROM subcategories WHERE category_id = $1 ORDER BY id', [id]);
  res.json({ ...catRows[0], subcategories: subRows });
});

// Delete a category and its subcategories
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  await pool.query('DELETE FROM subcategories WHERE category_id = $1', [id]);
  const result = await pool.query('DELETE FROM categories WHERE id = $1', [id]);
  if (result.rowCount === 0) { res.status(404).json({ error: 'Category not found' }); return; }
  res.status(204).send();
});

export default router;

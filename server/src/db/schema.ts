import pool from './connection.js';

export async function initializeDatabase(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT NOT NULL DEFAULT '🦝',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL,
      icon TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS subcategories (
      id SERIAL PRIMARY KEY,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '📌'
    );

    CREATE TABLE IF NOT EXISTS entries (
      id SERIAL PRIMARY KEY,
      profile_id INTEGER NOT NULL REFERENCES profiles(id),
      subcategory_id INTEGER NOT NULL REFERENCES subcategories(id),
      date DATE NOT NULL,
      start_time TEXT,
      duration_minutes INTEGER NOT NULL DEFAULT 15,
      tags JSONB DEFAULT '[]',
      note TEXT,
      is_active BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_entries_profile_date ON entries(profile_id, date);

    CREATE TABLE IF NOT EXISTS insights (
      id SERIAL PRIMARY KEY,
      profile_id INTEGER NOT NULL REFERENCES profiles(id),
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      content TEXT NOT NULL,
      generated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_insights_profile_dates ON insights(profile_id, start_date, end_date);

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id SERIAL PRIMARY KEY,
      profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(profile_id, endpoint)
    );
  `);

  // Migration: add is_active column if it doesn't exist (for existing databases)
  await pool.query(`
    ALTER TABLE entries ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;
  `);

  // Migration: add quiet hours to profiles
  await pool.query(`
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS quiet_hours_start TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS quiet_hours_end TEXT;
  `);

  // Migration: add description column to categories
  await pool.query(`
    ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
  `);

  // Seed descriptions for existing categories that don't have one
  const descriptionSeeds: Record<string, string> = {
    'Professional': 'Work-related activities — deep focus, meetings, email, planning, learning, and admin tasks',
    'People': 'Time spent with others — partner, family, friends, networking, and community involvement',
    'Growth': 'Personal development — reading, side projects, courses, writing/reflection, and fitness',
    'Vital': 'Essential life maintenance — sleep, meals, hygiene, commute, chores, and health appointments',
    'Leisure': 'Rest and recreation — gaming, social media, TV/movies, music, outdoors, and hobbies',
    'Planning': 'Life planning and logistics — travel, finances, and future preparation',
  };
  for (const [name, desc] of Object.entries(descriptionSeeds)) {
    await pool.query(
      `UPDATE categories SET description = $1 WHERE name = $2 AND description = ''`,
      [desc, name]
    );
  }
}

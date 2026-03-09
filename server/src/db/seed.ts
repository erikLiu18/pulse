import db from './connection.js';
import { initializeDatabase } from './schema.js';

initializeDatabase();

// Clear existing data for re-seeding
db.exec('DELETE FROM entries');
db.exec('DELETE FROM subcategories');
db.exec('DELETE FROM categories');
db.exec('DELETE FROM profiles');

// Seed profiles
const insertProfile = db.prepare('INSERT INTO profiles (id, name, avatar) VALUES (?, ?, ?)');
insertProfile.run(1, 'Mingxiao', '🦝');
insertProfile.run(2, 'Partner', '🐢');

// Seed categories
const insertCategory = db.prepare('INSERT INTO categories (id, name, color, icon, sort_order) VALUES (?, ?, ?, ?, ?)');
insertCategory.run(1, 'Professional', '#3B82F6', '💼', 1);
insertCategory.run(2, 'People',       '#FB7185', '❤️', 2);
insertCategory.run(3, 'Growth',       '#10B981', '🌱', 3);
insertCategory.run(4, 'Vital',        '#F59E0B', '⚡', 4);
insertCategory.run(5, 'Leisure',      '#A78BFA', '🎮', 5);

// Seed subcategories
const insertSub = db.prepare('INSERT INTO subcategories (id, category_id, name, icon) VALUES (?, ?, ?, ?)');
// Professional
insertSub.run(1,  1, 'Deep Work',         '🎯');
insertSub.run(2,  1, 'Meetings',          '🤝');
insertSub.run(3,  1, 'Email/Comms',       '📧');
insertSub.run(4,  1, 'Planning',          '📋');
insertSub.run(5,  1, 'Learning/Training', '📚');
insertSub.run(6,  1, 'Admin',             '🗂️');
// People
insertSub.run(7,  2, 'Partner Time',      '💕');
insertSub.run(8,  2, 'Family',            '👨‍👩‍👧');
insertSub.run(9,  2, 'Friends',           '👯');
insertSub.run(10, 2, 'Networking',        '🌐');
insertSub.run(11, 2, 'Community',         '🏘️');
// Growth
insertSub.run(12, 3, 'Reading',           '📖');
insertSub.run(13, 3, 'Side Projects',     '🔧');
insertSub.run(14, 3, 'Courses',           '🎓');
insertSub.run(15, 3, 'Writing/Reflection','✍️');
insertSub.run(16, 3, 'Fitness',           '💪');
// Vital
insertSub.run(17, 4, 'Sleep',             '😴');
insertSub.run(18, 4, 'Meals/Cooking',     '🍳');
insertSub.run(19, 4, 'Hygiene',           '🚿');
insertSub.run(20, 4, 'Commute',           '🚇');
insertSub.run(21, 4, 'Chores',            '🧹');
insertSub.run(22, 4, 'Health',            '🏥');
// Leisure
insertSub.run(23, 5, 'Gaming',            '🎮');
insertSub.run(24, 5, 'Social Media',      '📱');
insertSub.run(25, 5, 'TV/Movies',         '🎬');
insertSub.run(26, 5, 'Music',             '🎵');
insertSub.run(27, 5, 'Outdoors',          '🏕️');
insertSub.run(28, 5, 'Hobbies',           '🎨');

// Seed sample entries for today and yesterday
const today = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);

const insertEntry = db.prepare(
  'INSERT INTO entries (profile_id, subcategory_id, date, start_time, duration_minutes, tags, note) VALUES (?, ?, ?, ?, ?, ?, ?)'
);

// === Mingxiao's today ===
insertEntry.run(1, 17, today, '00:00', 420, '[]', null);               // Sleep 12am-7am
insertEntry.run(1, 19, today, '07:00', 30,  '[]', null);               // Hygiene
insertEntry.run(1, 18, today, '07:30', 30,  '[]', 'Oatmeal + coffee'); // Breakfast
insertEntry.run(1, 20, today, '08:00', 30,  '[]', null);               // Commute
insertEntry.run(1, 1,  today, '08:30', 120, '["#reranker"]', 'Working on SLM reranking model'); // Deep Work
insertEntry.run(1, 2,  today, '10:30', 60,  '["#teamSync"]', 'Weekly team standup');            // Meetings
insertEntry.run(1, 3,  today, '11:30', 30,  '[]', null);               // Email/Comms
insertEntry.run(1, 18, today, '12:00', 60,  '[]', 'Lunch with team');  // Meals
insertEntry.run(1, 1,  today, '13:00', 90,  '["#reranker"]', 'Fine-tuning experiments');        // Deep Work
insertEntry.run(1, 7,  today, '14:30', 30,  '[]', 'Quick call');       // Partner Time
insertEntry.run(1, 5,  today, '15:00', 60,  '["#papers"]', 'Reading quantization papers');      // Learning
insertEntry.run(1, 16, today, '16:00', 60,  '["#gym"]', 'Upper body day');                      // Fitness

// === Mingxiao's yesterday ===
insertEntry.run(1, 17, yesterday, '00:00', 420, '[]', null);            // Sleep
insertEntry.run(1, 19, yesterday, '07:00', 30,  '[]', null);            // Hygiene
insertEntry.run(1, 18, yesterday, '07:30', 30,  '[]', null);            // Breakfast
insertEntry.run(1, 1,  yesterday, '08:00', 180, '["#reranker"]', 'Model architecture work');    // Deep Work
insertEntry.run(1, 18, yesterday, '11:00', 60,  '[]', null);            // Lunch
insertEntry.run(1, 2,  yesterday, '12:00', 60,  '["#1on1"]', '1:1 with manager');              // Meetings
insertEntry.run(1, 13, yesterday, '13:00', 120, '["#pulse"]', 'Building Pulse app');            // Side Projects
insertEntry.run(1, 12, yesterday, '15:00', 60,  '[]', 'Finished chapter on transformer arch'); // Reading
insertEntry.run(1, 9,  yesterday, '16:00', 90,  '[]', 'Coffee with college friends');          // Friends
insertEntry.run(1, 25, yesterday, '18:00', 120, '[]', 'Movie night');   // TV/Movies

// === Mingxiao's two days ago ===
insertEntry.run(1, 17, twoDaysAgo, '00:00', 420, '[]', null);
insertEntry.run(1, 16, twoDaysAgo, '07:00', 60,  '["#run"]', 'Morning run');
insertEntry.run(1, 18, twoDaysAgo, '08:00', 30,  '[]', null);
insertEntry.run(1, 1,  twoDaysAgo, '08:30', 150, '["#reranker"]', null);
insertEntry.run(1, 4,  twoDaysAgo, '11:00', 60,  '[]', 'Sprint planning');
insertEntry.run(1, 18, twoDaysAgo, '12:00', 60,  '[]', null);
insertEntry.run(1, 1,  twoDaysAgo, '13:00', 120, '[]', null);
insertEntry.run(1, 15, twoDaysAgo, '15:00', 60,  '[]', 'Weekly reflection');
insertEntry.run(1, 7,  twoDaysAgo, '16:00', 120, '[]', 'Date night prep + dinner');
insertEntry.run(1, 23, twoDaysAgo, '18:00', 120, '[]', 'Gaming session');

// === Partner's today ===
insertEntry.run(2, 17, today, '00:00', 480, '[]', null);               // Sleep 12am-8am
insertEntry.run(2, 19, today, '08:00', 30,  '[]', null);               // Hygiene
insertEntry.run(2, 18, today, '08:30', 30,  '[]', null);               // Breakfast
insertEntry.run(2, 1,  today, '09:00', 120, '[]', 'Working on project');// Deep Work
insertEntry.run(2, 2,  today, '11:00', 60,  '[]', 'Team meeting');     // Meetings
insertEntry.run(2, 18, today, '12:00', 60,  '[]', null);               // Lunch
insertEntry.run(2, 1,  today, '13:00', 120, '[]', null);               // Deep Work
insertEntry.run(2, 16, today, '15:00', 45,  '["#yoga"]', 'Yoga class');// Fitness
insertEntry.run(2, 12, today, '16:00', 60,  '[]', 'Reading');          // Reading

// === Partner's yesterday ===
insertEntry.run(2, 17, yesterday, '00:00', 480, '[]', null);
insertEntry.run(2, 18, yesterday, '08:00', 30,  '[]', null);
insertEntry.run(2, 1,  yesterday, '08:30', 150, '[]', null);
insertEntry.run(2, 18, yesterday, '11:00', 60,  '[]', null);
insertEntry.run(2, 14, yesterday, '12:00', 120, '[]', 'Online course'); // Courses
insertEntry.run(2, 9,  yesterday, '14:00', 90,  '[]', 'Lunch with friends');
insertEntry.run(2, 27, yesterday, '16:00', 120, '[]', 'Hiking');        // Outdoors
insertEntry.run(2, 7,  yesterday, '18:00', 120, '[]', 'Dinner together');

console.log('Database seeded with sample data');
process.exit(0);

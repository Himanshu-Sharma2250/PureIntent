import { SQLiteDatabase } from 'expo-sqlite';

/**
 * Initializes the SQLite database on first load.
 * Creates the required tables and sets WAL journal mode for performance.
 */
export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  try {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS intents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        is_completed INTEGER DEFAULT 0,
        due_date TEXT,
        notification_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);

    // Migration check: Add notification_id column if it doesn't exist on older schema databases
    const tableInfo = await db.getAllAsync<{ name: string }>('PRAGMA table_info(intents);');
    const hasNotificationId = tableInfo.some((col) => col.name === 'notification_id');
    if (!hasNotificationId) {
      await db.execAsync('ALTER TABLE intents ADD COLUMN notification_id TEXT;');
      console.log('[Database] Migration: Added notification_id column to intents table.');
    }

    // Migration check: Convert legacy date-only due_date strings (YYYY-MM-DD) to ISO datetime strings (end of day 23:59:00.000Z)
    await db.execAsync(`
      UPDATE intents
      SET due_date = due_date || 'T23:59:00.000Z'
      WHERE due_date IS NOT NULL
        AND due_date NOT LIKE '%T%';
    `);

    console.log('[Database] Schema initialized successfully.');
  } catch (error) {
    console.error('[Database] Failed to initialize database schema:', error);
    throw error;
  }
}

/**
 * Helper to get a setting value by key.
 */
export async function getSetting(db: SQLiteDatabase, key: string, defaultValue: string): Promise<string> {
  try {
    const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?;', [key]);
    return row ? row.value : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Helper to set a setting value by key.
 */
export async function setSetting(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  try {
    await db.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;',
      [key, value]
    );
  } catch (error) {
    console.error(`[Database] Failed to set setting ${key}:`, error);
  }
}

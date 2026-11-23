import { SQLiteDatabase } from 'expo-sqlite';

/**
 * Initializes the SQLite database on first load.
 * Creates the required tables and sets WAL journal mode for performance.
 */
export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  try {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
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

    // Migration check: Rename existing notes table to comments if present from v3.0.0
    const existingTables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('notes', 'comments');"
    );
    const hasNotesTable = existingTables.some((t) => t.name === 'notes');
    const hasCommentsTable = existingTables.some((t) => t.name === 'comments');

    if (hasNotesTable && !hasCommentsTable) {
      await db.execAsync('ALTER TABLE notes RENAME TO comments;');
      console.log('[Database] Migration: Renamed notes table to comments.');
    }

    // Ensure comments table exists
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES intents(id) ON DELETE CASCADE
      );
    `);

    // Ensure active_timer table exists (holds at most one active running timer)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS active_timer (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        started_at TEXT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES intents(id) ON DELETE CASCADE
      );
    `);

    // Migration check: time_logs table schema (v4.0 minutes -> v4.1 seconds, nullable description, source column)
    const timeLogsTables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name = 'time_logs';"
    );
    const hasTimeLogsTable = timeLogsTables.length > 0;

    if (!hasTimeLogsTable) {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS time_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id INTEGER NOT NULL,
          time_spent_seconds INTEGER NOT NULL,
          description TEXT,
          work_date TEXT NOT NULL,
          source TEXT NOT NULL DEFAULT 'manual',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (task_id) REFERENCES intents(id) ON DELETE CASCADE
        );
      `);
    } else {
      const timeLogCols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(time_logs);');
      const hasMinutesCol = timeLogCols.some((col) => col.name === 'time_spent_minutes');
      const hasSourceCol = timeLogCols.some((col) => col.name === 'source');

      if (hasMinutesCol) {
        // Safe migration: table recreation preserving existing data with time_spent_minutes * 60 -> time_spent_seconds,
        // nullable description, and source default 'manual'
        await db.execAsync(`
          PRAGMA foreign_keys = OFF;

          CREATE TABLE time_logs_v41 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER NOT NULL,
            time_spent_seconds INTEGER NOT NULL,
            description TEXT,
            work_date TEXT NOT NULL,
            source TEXT NOT NULL DEFAULT 'manual',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (task_id) REFERENCES intents(id) ON DELETE CASCADE
          );

          INSERT INTO time_logs_v41 (id, task_id, time_spent_seconds, description, work_date, source, created_at, updated_at)
          SELECT id, task_id, (time_spent_minutes * 60), description, work_date, 'manual', created_at, updated_at
          FROM time_logs;

          DROP TABLE time_logs;

          ALTER TABLE time_logs_v41 RENAME TO time_logs;

          PRAGMA foreign_keys = ON;
        `);
        console.log('[Database] Migration: Migrated time_logs to v4.1.0 schema (time_spent_seconds, nullable description, source).');
      } else if (!hasSourceCol) {
        await db.execAsync("ALTER TABLE time_logs ADD COLUMN source TEXT NOT NULL DEFAULT 'manual';");
        console.log('[Database] Migration: Added source column to time_logs table.');
      }
    }

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

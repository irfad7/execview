import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "lawyer_dashboard.db");
const db = new Database(DB_PATH);

// Initialize schema
export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_configs (
      id TEXT PRIMARY KEY,
      service TEXT UNIQUE,
      client_id TEXT,
      client_secret TEXT,
      access_token TEXT,
      refresh_token TEXT,
      expires_at INTEGER,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS field_mappings (
      id TEXT PRIMARY KEY,
      service TEXT,
      dashboard_field TEXT,
      source_field TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(service, dashboard_field)
    );

    CREATE TABLE IF NOT EXISTS sync_cache (
      id TEXT PRIMARY KEY,
      service TEXT,
      data_type TEXT,
      payload TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sync_status (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      last_updated DATETIME,
      status TEXT,
      error_message TEXT
    );

    CREATE TABLE IF NOT EXISTS dashboard_cache (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service TEXT,
      level TEXT,
      message TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT,
      firm_name TEXT,
      email TEXT,
      phone TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Ensure initial sync status exists
  db.prepare("INSERT OR IGNORE INTO sync_status (id, status) VALUES (1, 'never_synced')").run();

  // Initialize profile if it doesn't exist
  db.prepare(`
    INSERT OR IGNORE INTO profile (id, name, firm_name, email, phone) 
    VALUES (1, 'John Doe', 'Doe Law Firm', 'admin@doelaw.com', '555-0123')
  `).run();

  // Initialize reporting schedule if it doesn't exist
  db.prepare("INSERT OR IGNORE INTO system_settings (key, value) VALUES ('reporting_schedule', ?)").run(JSON.stringify({ day: 'Monday', time: '09:00', enabled: false }));

  // Initialize API configs if they don't exist
  const services = ['Clio', 'GoHighLevel', 'QuickBooks'];
  for (const service of services) {
    db.prepare("INSERT OR IGNORE INTO api_configs (id, service) VALUES (?, ?)").run(service.toLowerCase(), service);
  }
}

export default db;

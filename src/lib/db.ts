import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const dbDir = join(process.cwd(), 'data');
const dbPath = join(dbDir, 'execview.db');

// Ensure data directory exists
if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
}

// Create SQLite database instance
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database tables if they don't exist
export function initializeDatabase() {
    // Create users table
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create sessions table
    db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            token TEXT UNIQUE NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    `);

    // Create api_configs table
    db.exec(`
        CREATE TABLE IF NOT EXISTS api_configs (
            id TEXT PRIMARY KEY,
            service TEXT NOT NULL,
            client_id TEXT,
            client_secret TEXT,
            access_token TEXT,
            refresh_token TEXT,
            expires_at INTEGER,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            user_id TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
            UNIQUE(service, user_id)
        )
    `);

    // Create field_mappings table
    db.exec(`
        CREATE TABLE IF NOT EXISTS field_mappings (
            id TEXT PRIMARY KEY,
            service TEXT NOT NULL,
            dashboard_field TEXT NOT NULL,
            source_field TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            user_id TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
            UNIQUE(service, dashboard_field, user_id)
        )
    `);

    // Create dashboard_cache table
    db.exec(`
        CREATE TABLE IF NOT EXISTS dashboard_cache (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            user_id TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
            UNIQUE(user_id)
        )
    `);

    // Create sync_status table
    db.exec(`
        CREATE TABLE IF NOT EXISTS sync_status (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            last_updated DATETIME,
            status TEXT,
            error_message TEXT,
            user_id TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
            UNIQUE(user_id)
        )
    `);

    // Create logs table
    db.exec(`
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            service TEXT NOT NULL,
            level TEXT NOT NULL,
            message TEXT NOT NULL,
            details TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            user_id TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    `);

    // Create system_settings table
    db.exec(`
        CREATE TABLE IF NOT EXISTS system_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            user_id TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
            UNIQUE(key, user_id)
        )
    `);

    // Create profiles table
    db.exec(`
        CREATE TABLE IF NOT EXISTS profiles (
            id TEXT PRIMARY KEY,
            name TEXT,
            firm_name TEXT,
            email TEXT,
            phone TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (id) REFERENCES users (id) ON DELETE CASCADE
        )
    `);

    console.log('Database initialized successfully');
}

// Seed default data for demo/development
export function seedDatabase() {
    // Create a default admin user (password: admin123)
    const hashedPassword = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'; // bcrypt hash for 'admin123'
    
    try {
        const stmt = db.prepare(`
            INSERT OR IGNORE INTO users (id, email, password) 
            VALUES (?, ?, ?)
        `);
        
        const userId = 'default-user-id';
        stmt.run(userId, 'admin@lawfirm.com', hashedPassword);

        // Create default profile
        const profileStmt = db.prepare(`
            INSERT OR IGNORE INTO profiles (id, name, firm_name, email) 
            VALUES (?, ?, ?, ?)
        `);
        profileStmt.run(userId, 'Admin User', 'Demo Law Firm', 'admin@lawfirm.com');

        // Create default API configs
        const configStmt = db.prepare(`
            INSERT OR IGNORE INTO api_configs (id, service, user_id) 
            VALUES (?, ?, ?)
        `);
        
        ['clio', 'execview', 'quickbooks'].forEach((service, index) => {
            configStmt.run(`config-${service}`, service, userId);
        });

        console.log('Database seeded with default data');
    } catch (error) {
        console.log('Database already seeded or error occurred:', error);
    }
}

export { db };
export default db;
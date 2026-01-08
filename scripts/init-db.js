const { initializeDatabase, seedDatabase } = require('../src/lib/db.ts');

console.log('Initializing SQLite database...');

try {
    initializeDatabase();
    seedDatabase();
    console.log('✅ Database initialized and seeded successfully!');
    console.log('');
    console.log('Demo credentials:');
    console.log('Email: admin@lawfirm.com');
    console.log('Password: admin123');
} catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
}
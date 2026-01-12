import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function initializeDefaultUser() {
  try {
    console.log('Connecting to Neon database...');
    
    // Check if user already exists
    const existingUser = await prisma.user.findFirst();
    
    if (existingUser) {
      console.log('User already exists:', existingUser.email);
      console.log('User ID:', existingUser.id);
      return;
    }

    console.log('Creating default user...');
    
    // Create default user
    const hashedPassword = await bcrypt.hash('MLA@2026', 10);
    
    const user = await prisma.user.create({
      data: {
        email: 'admin@mylegalacademy.com',
        password: hashedPassword
      }
    });

    console.log('✅ Default user created successfully!');
    console.log('Email:', user.email);
    console.log('Password: MLA@2026');
    console.log('User ID:', user.id);
    console.log('Created at:', user.createdAt);

    // Create default profile
    const profile = await prisma.profile.create({
      data: {
        userId: user.id,
        name: 'My Legal Academy Admin',
        firmName: 'My Legal Academy',
        email: user.email,
        phone: '',
        practiceAreas: JSON.stringify(['General Practice']),
        timezone: 'America/New_York',
        businessHours: JSON.stringify({
          monday: { start: '09:00', end: '17:00', open: true },
          tuesday: { start: '09:00', end: '17:00', open: true },
          wednesday: { start: '09:00', end: '17:00', open: true },
          thursday: { start: '09:00', end: '17:00', open: true },
          friday: { start: '09:00', end: '17:00', open: true },
          saturday: { start: '10:00', end: '14:00', open: false },
          sunday: { start: '10:00', end: '14:00', open: false }
        })
      }
    });

    console.log('✅ Default profile created!');
    console.log('Profile ID:', profile.id);

  } catch (error) {
    console.error('❌ Error initializing user:', error);
    if (error.code === 'P2002') {
      console.log('User might already exist with this email');
    }
  } finally {
    await prisma.$disconnect();
    console.log('Database connection closed');
  }
}

console.log('🚀 Initializing My Legal Academy default user...');
initializeDefaultUser();
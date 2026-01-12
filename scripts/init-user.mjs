import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function initializeDefaultUser() {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst();
    
    if (existingUser) {
      console.log('User already exists:', existingUser.email);
      return;
    }

    // Create default user
    const hashedPassword = await bcrypt.hash('MLA@2026', 10);
    
    const user = await prisma.user.create({
      data: {
        email: 'admin@mylegalacademy.com',
        password: hashedPassword
      }
    });

    console.log('Default user created successfully:');
    console.log('Email:', user.email);
    console.log('Password: MLA@2026');
    console.log('User ID:', user.id);

  } catch (error) {
    console.error('Error initializing user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

initializeDefaultUser();
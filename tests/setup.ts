import { PrismaClient } from '@prisma/client';

declare global {
  var __PRISMA__: PrismaClient | undefined;
}

// This ensures we use a single Prisma client instance during tests
global.__PRISMA__ = global.__PRISMA__ || new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db'
    }
  }
});

export const prisma = global.__PRISMA__;
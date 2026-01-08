import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

export type MockPrisma = DeepMockProxy<PrismaClient>;

declare global {
  var __PRISMA__: MockPrisma | undefined;
}

// Create a mock Prisma instance for tests
global.__PRISMA__ = global.__PRISMA__ || mockDeep<PrismaClient>();

export const prisma = global.__PRISMA__;

beforeEach(() => {
  mockReset(prisma);
});
import { PrismaClient } from '@prisma/client';
import { config } from '../shared/config';

declare global {
  var __prisma: PrismaClient | undefined;
}

const prisma = globalThis.__prisma || new PrismaClient({
  log: config.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  errorFormat: 'minimal'
});

if (config.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

export async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

export async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    console.log('✅ Database disconnected');
  } catch (error) {
    console.error('❌ Database disconnection failed:', error);
    throw error;
  }
}

export { prisma };
export default prisma;
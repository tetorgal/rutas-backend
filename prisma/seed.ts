import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create Routes
  const routes = [
    { nombre: 'Ruta Poniente', colorHex: '#3B82F6' },
    { nombre: 'Ruta Norte', colorHex: '#10B981' },
    { nombre: 'Ruta Oriente', colorHex: '#F59E0B' },
    { nombre: 'Ruta Sur', colorHex: '#EF4444' },
    { nombre: 'Ruta Centro', colorHex: '#8B5CF6' },
  ];

  console.log('Creating routes...');
  for (const route of routes) {
    await prisma.ruta.upsert({
      where: { nombre: route.nombre },
      update: {},
      create: route,
    });
  }

  console.log('Database seeded successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

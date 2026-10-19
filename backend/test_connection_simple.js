require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

console.log('Test de connexion Prisma...\n');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function test() {
  try {
    console.log('1. Tentative de connexion...');
    await prisma.$connect();
    console.log('✅ Connexion réussie!');
    
    console.log('2. Test de requête simple...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Requête réussie:', result);
    
    await prisma.$disconnect();
    console.log('\n✅ Tout fonctionne!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.error('Code:', error.code);
    console.error('Meta:', error.meta);
    process.exit(1);
  }
}

test();

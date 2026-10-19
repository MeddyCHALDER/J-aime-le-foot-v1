require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const originalUrl = process.env.DATABASE_URL;
console.log('URL originale:', originalUrl.replace(/:[^:@]+@/, ':****@'));

const variants = [
  { name: 'Avec ?sslmode=require', url: originalUrl },
  { name: 'Avec ?sslmode=prefer', url: originalUrl.replace('sslmode=require', 'sslmode=prefer') },
  { name: 'Avec ?sslmode=disable', url: originalUrl.replace('sslmode=require', 'sslmode=disable') },
  { name: 'Sans paramètres SSL', url: originalUrl.split('?')[0] },
];

async function testVariant(name, url) {
  process.env.DATABASE_URL = url;
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    console.log(`\n✅ ${name}: CONNEXION RÉUSSIE!`);
    await prisma.$disconnect();
    console.log(`\n💡 Utilisez cette URL dans votre .env:`);
    console.log(`DATABASE_URL="${url}"`);
    return true;
  } catch (err) {
    console.log(`❌ ${name}: ${err.message.substring(0, 80)}`);
    await prisma.$disconnect().catch(() => {});
    return false;
  }
}

async function testAll() {
  for (const variant of variants) {
    const success = await testVariant(variant.name, variant.url);
    if (success) {
      process.exit(0);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.log('\n❌ Aucune variante n\'a fonctionné.');
  console.log('\n💡 Vérifiez dans Neon:');
  console.log('   1. Allez dans Settings > Security');
  console.log('   2. Vérifiez les paramètres IP Allowlist');
  console.log('   3. Essayez de redémarrer le compute de la branche production');
  process.exit(1);
}

testAll();

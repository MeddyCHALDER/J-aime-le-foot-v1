require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

// Test avec URL modifiée (sans channel_binding)
const originalUrl = process.env.DATABASE_URL;
const testUrl = originalUrl.replace('&channel_binding=require', '').replace('?channel_binding=require', '');

console.log('Test 1: URL originale');
const prisma1 = new PrismaClient();
prisma1.$connect().then(() => {
  console.log('✅ Connexion réussie avec URL originale');
  prisma1.$disconnect();
  process.exit(0);
}).catch(err => {
  console.log('❌ Erreur avec URL originale:', err.message);
  
  console.log('\nTest 2: URL sans channel_binding');
  process.env.DATABASE_URL = testUrl;
  const prisma2 = new PrismaClient();
  prisma2.$connect().then(() => {
    console.log('✅ Connexion réussie sans channel_binding');
    prisma2.$disconnect();
    process.exit(0);
  }).catch(err2 => {
    console.log('❌ Erreur sans channel_binding:', err2.message);
    console.log('\n💡 Vérifiez dans le dashboard Neon:');
    console.log('   1. Que la base est bien active');
    console.log('   2. Que l\'URL de connexion est correcte');
    console.log('   3. Essayez l\'URL directe (non-pooler) si disponible');
    process.exit(1);
  });
});

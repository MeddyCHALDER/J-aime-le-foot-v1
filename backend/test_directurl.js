require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

console.log('Test de connexion avec directUrl (DATABASE_URL_UNPOOLED)...\n');
const prisma = new PrismaClient();

prisma.$connect()
  .then(() => {
    console.log('✅ Connexion réussie avec directUrl!');
    return prisma.user.findFirst();
  })
  .then(() => {
    console.log('✅ Requête réussie!');
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Erreur:', err.message);
    prisma.$disconnect();
    process.exit(1);
  });

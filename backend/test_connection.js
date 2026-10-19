require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

console.log('Test de connexion Prisma...\n');
const prisma = new PrismaClient();

prisma.$connect()
  .then(() => {
    console.log('✅ Connexion réussie!');
    return prisma.user.findFirst();
  })
  .then(() => {
    console.log('✅ Requête réussie!');
    console.log('La base de données est accessible.');
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Erreur:', err.message);
    prisma.$disconnect();
    process.exit(1);
  });

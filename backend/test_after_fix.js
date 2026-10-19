require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

console.log('Vérification des URLs...\n');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? (process.env.DATABASE_URL.includes('channel_binding') ? '❌ Contient channel_binding' : '✅ OK') : '❌ Non trouvée');
console.log('DATABASE_URL_UNPOOLED:', process.env.DATABASE_URL_UNPOOLED ? (process.env.DATABASE_URL_UNPOOLED.includes('channel_binding') ? '❌ Contient channel_binding' : '✅ OK') : '❌ Non trouvée');

if (process.env.DATABASE_URL && process.env.DATABASE_URL_UNPOOLED && 
    !process.env.DATABASE_URL.includes('channel_binding') && 
    !process.env.DATABASE_URL_UNPOOLED.includes('channel_binding')) {
  console.log('\nTest de connexion...\n');
  const prisma = new PrismaClient();
  prisma.$connect()
    .then(() => {
      console.log('✅ Connexion réussie!');
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
} else {
  console.log('\n⚠️  Retirez channel_binding des deux URLs dans .env');
  process.exit(1);
}

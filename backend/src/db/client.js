// Client Prisma pour "J'aime le Foot"
// Nécessite l'installation de prisma et @prisma/client :
// npm install prisma @prisma/client
// npx prisma generate

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

module.exports = prisma;



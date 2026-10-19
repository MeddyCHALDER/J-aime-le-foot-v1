require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

console.log('Test de connexion directe avec pg...\n');

client.connect()
  .then(() => {
    console.log('✅ Connexion réussie avec pg!');
    return client.query('SELECT version()');
  })
  .then((result) => {
    console.log('✅ Requête réussie:', result.rows[0].version.substring(0, 50) + '...');
    client.end();
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Erreur:', err.message);
    console.error('Code:', err.code);
    client.end();
    process.exit(1);
  });

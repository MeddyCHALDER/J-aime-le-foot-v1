require('dotenv').config();
const app = require("./src/app");
const { port } = require("./src/config");

app.listen(port, () => {
  console.log(`Backend J'aime le Foot en écoute sur le port ${port}`);
});

require("dotenv").config();
const app = require("./src/app");

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Backend J'aime le Foot en écoute sur le port ${PORT}`);
});

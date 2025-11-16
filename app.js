// app.js - Solo la aplicación Express, sin iniciar servidor
const pool = require("./config/config.js");
const express = require("express");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Conectar a la base de datos (solo en modo producción/desarrollo, no en testing)
if (process.env.NODE_ENV !== "test") {
  pool
    .getConnection()
    .then(() => console.log("Conexión a la base de datos exitosa"))
    .catch((err) =>
      console.error("Error de conexión a la base de datos:", err)
    );
}

// Error handler
app.use((err, req, res, next) => {
  console.log(err);
  res.status(err.status || 500).send(err.stack);
});

// Routes
const userRoutes = require("./routes/userRoutes");
const eventsRoutes = require("./routes/eventsRoutes");
const placesRoutes = require("./routes/placesRoutes.js");
const authRoutes = require("./routes/authRoutes.js");
const theaterRoutes = require("./routes/theaterRoutes.js");
const transactionRoutes = require("./routes/transactionRoutes.js");
const cinemaRoutes = require("./routes/cinemaRoutes.js");
const museumRoutes = require("./routes/museumRoutes.js");

userRoutes(app);
eventsRoutes(app);
placesRoutes(app);
authRoutes(app);
theaterRoutes(app);
transactionRoutes(app);
cinemaRoutes(app);
museumRoutes(app);

// Exportar solo la app, sin server
module.exports = app;

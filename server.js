const app = require("./app");
const http = require("http");

const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Solo iniciar el servidor si no estamos en entorno de testing
if (process.env.NODE_ENV !== "test") {
  server.listen(PORT, "0.0.0.0", function () {
    console.log(
      "Hola Mundo NodeJS " + process.pid + " iniciado en puerto " + PORT
    );
  });
}

module.exports = server;

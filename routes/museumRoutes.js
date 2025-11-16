const Auth = require("../middlewares/authMiddleware");
const MuseumController = require("../controllers/museumController");

module.exports = (app) => {
  app.get(
    "/api/museum/availability/:id",
    Auth.verifyToken,
    MuseumController.getMuseoAvailability
  );
};

const Auth = require("../middlewares/authMiddleware");
const CinemaController = require("../controllers/cinemaController");

module.exports = (app) => {
  app.get(
    "/api/cinema/room-types",
    Auth.verifyToken,
    CinemaController.getRoomTypes
  );

  app.get(
    "/api/cinema/categories",
    Auth.verifyToken,
    CinemaController.getCategories
  );

  app.get(
    "/api/cinema/events/:roomType/:cinemaId",
    Auth.verifyToken,
    CinemaController.getEventsByCinemaRoom
  );

  app.get(
    "/api/cinema/event/:id/seats",
    Auth.verifyToken,
    CinemaController.getSeatsByEventId
  );
};

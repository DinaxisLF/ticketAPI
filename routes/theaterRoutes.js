const TheaterController = require("../controllers/theaterController");
const Auth = require("../middlewares/authMiddleware");

module.exports = (app) => {
  app.get(
    "/api/theater/theaterId/:id",
    Auth.verifyToken,
    TheaterController.getEventsByTeatherId
  );

  app.get(
    "/api/theater/eventId/:id/seats",
    TheaterController.getSeatsByEventId
  );
};

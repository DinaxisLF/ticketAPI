const PlaceController = require("../controllers/placesController");
const Auth = require("../middlewares/authMiddleware");

module.exports = (app) => {
  app.get(
    "/api/places/type/:type",
    Auth.verifyToken,
    PlaceController.getPlacesByType
  );
};

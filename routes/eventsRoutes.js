const EventControler = require("../controllers/eventsController");
const Auth = require("../middlewares/authMiddleware");

module.exports = (app) => {
  app.post(
    "/api/events",
    Auth.verifyToken,
    Auth.requireAdmin,
    EventControler.createEvent
  );

  app.get(
    "/api/events/:id",
    EventControler.getEventById,
    Auth.verifyToken,
    Auth.requireAdmin
  );

  app.get(
    "/api/events",
    EventControler.getAllEvents,
    Auth.verifyToken,
    Auth.requireAdmin
  );

  app.put(
    "/api/events/:id",
    EventControler.updateEvent,
    Auth.verifyToken,
    Auth.requireAdmin
  );

  app.put(
    "/api/events/deactivate/:id",
    EventControler.deactivateEvent,
    Auth.verifyToken,
    Auth.requireAdmin
  );

  app.delete(
    "/api/events/:id",
    EventControler.deleteEvent,
    Auth.verifyToken,
    Auth.requireAdmin
  );
};

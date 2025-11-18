const UserController = require("../controllers/userController");
const Auth = require("../middlewares/authMiddleware");

module.exports = (app) => {
  app.post("/api/users", UserController.createUser);

  app.post(
    "/api/users/admin",
    Auth.verifyToken,
    Auth.requireAdmin,
    UserController.createAdminUser
  );

  app.get("/api/users/exists/:username", UserController.checkUserExists);
};

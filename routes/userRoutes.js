const UserController = require("../controllers/userController");
const Auth = require("../middlewares/authMiddleware");

module.exports = (app) => {
  app.post("/api/users", UserController.createUser);

  app.post(
    "/api/users/admin",
    UserController.createAdminUser,
    Auth.requireAdmin,
    Auth.verifyToken
  );

  app.get("/api/users/exists/:username", UserController.checkUserExists);
};

const AuthController = require("../controllers/authController");
const Auth = require("../middlewares/authMiddleware");

module.exports = (app) => {
  app.post("/api/auth/login", AuthController.login);
};

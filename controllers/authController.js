const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const secret = process.env.JWT_SECRET;

module.exports = {
  async login(req, res, next) {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Faltan datos obligatorios" });
    }

    try {
      const user = await User.findByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Credenciales inválidas" });
      }
      const passwordMatch = await bcrypt.compare(password, user.hash_password);
      if (!passwordMatch) {
        return res.status(401).json({ message: "Credenciales inválidas" });
      }

      const { hash_password, ...userWithoutPassword } = user;

      const token = jwt.sign(
        {
          id: userWithoutPassword.id,
          role: userWithoutPassword.is_admin,
        },
        secret,
        {
          expiresIn: "2h",
        }
      );

      return res.status(200).json({
        message: "Login exitoso",
        token: token,
        user: userWithoutPassword,
      });
    } catch (error) {
      console.error("Error en login:", error);
      return res.status(500).json({ message: "Error en el servidor" });
    }
  },
};

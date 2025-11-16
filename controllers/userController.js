const User = require("../models/user");
const bcrypt = require("bcrypt");

module.exports = {
  async createUser(req, res, next) {
    const user = req.body;

    if (
      !user.nombre ||
      !user.correo ||
      !user.nombre_usuario ||
      !user.password
    ) {
      return res.status(400).json({ message: "Faltan datos obligatorios" });
    }

    try {
      const hash_password = await bcrypt.hash(user.password, 10);

      const newUser = await User.create(user, hash_password);

      if (newUser.affectedRows === 1) {
        return res.status(201).json({ message: "Usuario creado exitosamente" });
      } else {
        return res.status(500).json({ message: "No se pudo crear el usuario" });
      }
    } catch (error) {
      console.error("Error al crear usuario:", error);
      return res.status(500).json({ message: "Error al crear usuario" });
    }
  },

  async checkUserExists(req, res, next) {
    const { username } = req.params;

    const userExists = await User.findByUsername(username);

    if (userExists) {
      return res.status(200).json({ exists: true });
    } else {
      return res.status(200).json({ exists: false });
    }
  },

  async createAdminUser(req, res, next) {
    const user = req.body;

    if (
      !user.nombre ||
      !user.correo ||
      !user.nombre_usuario ||
      !user.password
    ) {
      return res.status(400).json({ message: "Faltan datos obligatorios" });
    }

    try {
      const hash_password = await bcrypt.hash(user.password, 10);

      const newUser = await User.create(user, hash_password);

      if (newUser.affectedRows === 1) {
        return res.status(201).json({ message: "Usuario creado exitosamente" });
      } else {
        return res.status(500).json({ message: "No se pudo crear el usuario" });
      }
    } catch (error) {
      console.error("Error al crear usuario admin:", error);
      return res.status(500).json({ message: "Error al crear usuario admin" });
    }
  },
};

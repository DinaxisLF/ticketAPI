const db = require("../config/config");

const User = {};

User.create = (user, hash_password) => {
  const query =
    "INSERT INTO users (nombre, correo, nombre_usuario, hash_password) VALUES (?, ?, ?, ?)";
  return db.execute(query, [
    user.nombre,
    user.correo,
    user.nombre_usuario,
    hash_password,
  ]);
};

User.createAdmin = (user, hash_password) => {
  const query =
    "INSERT INTO users (nombre, correo, nombre_usuario, hash_password, is_admin) VALUES (?, ?, ?, ?, ?)";

  return db.execute(query, [
    user.nombre,
    user.correo,
    user.nombre_usuario,
    hash_password,
    1,
  ]);
};

User.findByUsername = async (username) => {
  const query = "SELECT * FROM users WHERE nombre_usuario = ?";
  const [rows] = await db.execute(query, [username]);
  return rows.length > 0 ? rows[0] : null;
};

module.exports = User;

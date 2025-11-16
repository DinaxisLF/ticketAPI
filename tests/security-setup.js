// tests/security-setup.js
const request = require("supertest");
const app = require("../app"); // Ajusta la ruta a tu app
const jwt = require("jsonwebtoken");

// Configuración basada en tu implementación
const JWT_SECRET =
  "5b2f4f29742a6f7725ee3314db383a749674317ed0d8b86d5097dd53e5e4a015"; // Usa el mismo secret de tu app

const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "2h" });
};

// Tokens según tu estructura de usuario
const adminToken = generateToken({
  id: 1,
  role: 1, // is_admin = 1
});

const userToken = generateToken({
  id: 2,
  role: 0, // is_admin = 0
});

const invalidToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.payload";

module.exports = {
  adminToken,
  userToken,
  invalidToken,
};

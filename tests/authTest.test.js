// Simulamos variables de entorno
process.env.JWT_SECRET = "testsecret";

const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

// Importar tus rutas y controladores
const userRoutes = require("../routes/userRoutes");
const authRoutes = require("../routes/authRoutes");
const User = require("../models/user"); // Importamos el modelo para mockearlo

// Mocks
jest.mock("../models/user");
jest.mock("bcrypt");

const app = express();
app.use(express.json());

// Inicializar rutas
userRoutes(app);
authRoutes(app);

describe("API Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Limpiar mocks antes de cada test
  });

  // --- TESTS DE AUTENTICACIÓN ---
  describe("POST /api/auth/login", () => {
    it("Debe retornar 200 y un token con credenciales válidas", async () => {
      // Mock de usuario encontrado
      const mockUser = {
        id: 1,
        username: "testuser",
        hash_password: "hashedpassword",
        is_admin: 0,
      };
      User.findByUsername.mockResolvedValue(mockUser);
      // Mock de bcrypt true
      bcrypt.compare.mockResolvedValue(true);

      const res = await request(app)
        .post("/api/auth/login")
        .send({ username: "testuser", password: "password123" });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("token");
      expect(res.body.message).toBe("Login exitoso");
    });

    it("Debe retornar 401 si el usuario no existe", async () => {
      User.findByUsername.mockResolvedValue(null); // Usuario no encontrado

      const res = await request(app)
        .post("/api/auth/login")
        .send({ username: "nobody", password: "123" });

      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toBe("Credenciales inválidas");
    });
  });

  // --- TESTS DE CREACIÓN DE USUARIO ---
  describe("POST /api/users", () => {
    it("Debe crear un usuario exitosamente (201)", async () => {
      // Mock de la creación
      User.create.mockResolvedValue({ affectedRows: 1 });
      bcrypt.hash.mockResolvedValue("newhashedpassword");

      const res = await request(app).post("/api/users").send({
        nombre: "Juan",
        correo: "juan@mail.com",
        nombre_usuario: "juan123",
        password: "securepass",
      });

      expect(res.statusCode).toEqual(201);
      expect(res.body.message).toBe("Usuario creado exitosamente");
    });

    it("Debe retornar 400 si faltan datos", async () => {
      const res = await request(app)
        .post("/api/users")
        .send({ nombre: "Solo Nombre" }); // Faltan campos

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toBe("Faltan datos obligatorios");
    });
  });

  // --- TESTS DE EXISTENCIA DE USUARIO ---
  describe("GET /api/users/exists/:username", () => {
    it("Debe retornar true si el usuario existe", async () => {
      User.findByUsername.mockResolvedValue({ id: 1, username: "existe" });

      const res = await request(app).get("/api/users/exists/existe");

      expect(res.statusCode).toEqual(200);
      expect(res.body.exists).toBe(true);
    });

    it("Debe retornar false si el usuario no existe", async () => {
      User.findByUsername.mockResolvedValue(null);

      const res = await request(app).get("/api/users/exists/noexiste");

      expect(res.statusCode).toEqual(200);
      expect(res.body.exists).toBe(false);
    });
  });

  // --- TESTS DE CREACIÓN DE ADMIN (Ruta Protegida) ---
  describe("POST /api/users/admin", () => {
    // Generar un token de admin falso para las pruebas
    const adminToken = jwt.sign({ id: 1, role: 1 }, process.env.JWT_SECRET);
    const userToken = jwt.sign({ id: 2, role: 0 }, process.env.JWT_SECRET);

    it("Debe rechazar acceso (403) sin token", async () => {
      // Nota: Este test asume que corregiste el orden de los middlewares
      const res = await request(app).post("/api/users/admin").send({});

      expect(res.statusCode).toBe(403); // O 401 dependiendo de cómo manejes "Token requerido"
    });

    it("Debe rechazar acceso (403) si no es admin", async () => {
      const res = await request(app)
        .post("/api/users/admin")
        .set("Authorization", `Bearer ${userToken}`)
        .send({}); // Datos vacíos para probar middleware primero

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe("Acceso solo para admins");
    });

    it("Debe permitir crear admin si tiene token de admin", async () => {
      User.create.mockResolvedValue({ affectedRows: 1 });
      bcrypt.hash.mockResolvedValue("adminpass");

      const res = await request(app)
        .post("/api/users/admin")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          nombre: "Admin",
          correo: "admin@mail.com",
          nombre_usuario: "superadmin",
          password: "adminpass",
        });

      expect(res.statusCode).toEqual(201);
    });
  });
});

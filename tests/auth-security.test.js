const request = require("supertest");
const app = require("../app");

// Mock completo de los modelos
jest.mock("../models/user.js", () => ({
  findByUsername: jest.fn().mockImplementation((username) => {
    // Simular que no encuentra ningún usuario para pruebas de seguridad
    return Promise.resolve(null);
  }),
}));

jest.mock("../config/config.js", () => ({
  getConnection: jest.fn().mockResolvedValue({
    execute: jest.fn().mockResolvedValue([[]]),
    query: jest.fn().mockResolvedValue([[]]),
    release: jest.fn(),
  }),
}));

describe("Pruebas de Seguridad - POST /api/auth/login", () => {
  describe("Validación de entrada", () => {
    it("debería rechazar solicitud sin username o password", async () => {
      const tests = [
        { username: "", password: "password123" },
        { username: "admin", password: "" },
        { username: "", password: "" },
      ];

      for (const test of tests) {
        const response = await request(app).post("/api/auth/login").send(test);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty(
          "message",
          "Faltan datos obligatorios"
        );
      }
    });
  });

  describe("Prevención de inyección SQL", () => {
    const sqlInjectionTests = [
      {
        name: "SQL Injection básico",
        payload: { username: "admin' OR '1'='1", password: "any" },
      },
      {
        name: "SQL Injection con comentarios",
        payload: { username: "admin'; --", password: "any" },
      },
    ];

    sqlInjectionTests.forEach((test) => {
      it(`debería manejar ${test.name} sin errores de servidor`, async () => {
        const response = await request(app)
          .post("/api/auth/login")
          .send(test.payload);

        // Lo importante es que no haya error 500 del servidor
        expect(response.status).not.toBe(500);

        // No debería revelar información de la base de datos
        if (response.body.error) {
          expect(response.body.error).not.toMatch(/sql|database|query/i);
        }

        // Debería ser 401 o 400, no 200
        expect(response.status).not.toBe(200);
      });
    });
  });

  describe("Comportamiento con credenciales inválidas", () => {
    it("debería retornar error genérico sin revelar información", async () => {
      const response = await request(app).post("/api/auth/login").send({
        username: "usuario_inexistente",
        password: "password_incorrecto",
      });

      // Debería ser 401 con mensaje genérico
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("message");
      // El mensaje no debería revelar si el usuario existe o no
      expect(response.body.message).not.toMatch(
        /usuario no existe|usuario encontrado/i
      );
    });
  });
});

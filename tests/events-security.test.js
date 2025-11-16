const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("../models/events.js", () => ({
  create: jest.fn(),
}));

jest.mock("../models/user.js", () => ({
  findByUsername: jest.fn(),
}));

jest.mock("bcrypt", () => ({
  compare: jest.fn(),
}));

jest.mock("../config/config.js", () => ({}));


const app = require("../app");

// Obtener referencias a los mocks
const eventsModel = require("../models/events");
const userModel = require("../models/user");
const bcrypt = require("bcrypt");

// Tokens de prueba
const JWT_SECRET = "test-secret-key-for-jest";
const adminToken = jwt.sign({ id: 1, role: 1 }, JWT_SECRET, {
  expiresIn: "2h",
});
const userToken = jwt.sign({ id: 2, role: 0 }, JWT_SECRET, { expiresIn: "2h" });
const invalidToken = "invalid-token";

describe("Pruebas de Seguridad - POST /api/events", () => {
  beforeEach(() => {
    // Configurar mocks para cada test
    userModel.findByUsername.mockResolvedValue({
      id: 1,
      username: "admin",
      hash_password: "$2b$10$hashedpassword",
      is_admin: 1,
    });

    bcrypt.compare.mockResolvedValue(true);

    // Configurar por defecto para éxito
    eventsModel.create.mockResolvedValue({
      affectedRows: 1,
      insertId: 123,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Control de acceso y autorización", () => {
    it("debería rechazar acceso sin token", async () => {
      const response = await request(app).post("/api/events").send({
        id_lugar: 1,
        tipo_evento: "Concierto",
        nombre_evento: "Evento Test",
        capacidad: 100,
        horario_inicio: "2024-12-01 20:00:00",
        horario_fin: "2024-12-01 23:00:00",
      });

      expect([401, 403]).toContain(response.status);
    });

    it("debería rechazar acceso con token inválido", async () => {
      const response = await request(app)
        .post("/api/events")
        .set("Authorization", `Bearer ${invalidToken}`)
        .send({
          id_lugar: 1,
          tipo_evento: "Concierto",
          nombre_evento: "Evento Test",
          capacidad: 100,
          horario_inicio: "2024-12-01 20:00:00",
          horario_fin: "2024-12-01 23:00:00",
        });

      expect([401, 403]).toContain(response.status);
    });

    it("debería rechazar acceso con token de usuario normal", async () => {
      // Para este test, simular que el usuario no es admin
      userModel.findByUsername.mockResolvedValueOnce({
        id: 2,
        username: "user",
        hash_password: "$2b$10$hashedpassword",
        is_admin: 0,
      });

      const response = await request(app)
        .post("/api/events")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          id_lugar: 1,
          tipo_evento: "Concierto",
          nombre_evento: "Evento Test",
          capacidad: 100,
          horario_inicio: "2024-12-01 20:00:00",
          horario_fin: "2024-12-01 23:00:00",
        });

      expect(response.status).toBe(403);
    });

    it("debería permitir acceso con token de admin válido", async () => {
      const eventData = {
        id_lugar: 1,
        tipo_evento: "Concierto",
        nombre_evento: "Evento Test",
        capacidad: 100,
        horario_inicio: "2024-12-01 20:00:00",
        horario_fin: "2024-12-01 23:00:00",
      };

      const response = await request(app)
        .post("/api/events")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(eventData);

      // Debugging para ver qué está pasando
      console.log("DEBUG - Status:", response.status);
      console.log("DEBUG - Body:", response.body);
      console.log(
        "DEBUG - EventsModel.create llamado:",
        eventsModel.create.mock.calls.length
      );
      console.log(
        "DEBUG - EventsModel.create argumentos:",
        eventsModel.create.mock.calls[0]
      );
      console.log(
        "DEBUG - EventsModel.create resultado:",
        eventsModel.create.mock.results[0]?.value
      );

      // Verificaciones
      expect(eventsModel.create).toHaveBeenCalledTimes(1);
      expect(eventsModel.create).toHaveBeenCalledWith(eventData);

      // Esto debería funcionar ahora
      expect(response.status).toBe(201);
      expect(response.body.message).toBe("Evento creado exitosamente");
    });

    it("debería manejar error cuando la creación falla", async () => {
      // Simular fallo en la creación
      eventsModel.create.mockResolvedValueOnce({ affectedRows: 0 });

      const response = await request(app)
        .post("/api/events")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          id_lugar: 1,
          tipo_evento: "Concierto",
          nombre_evento: "Evento Test",
          capacidad: 100,
          horario_inicio: "2024-12-01 20:00:00",
          horario_fin: "2024-12-01 23:00:00",
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("No se pudo crear el evento");
    });
  });

  describe("Validación de datos", () => {
    it("debería rechazar datos incompletos", async () => {
      const response = await request(app)
        .post("/api/events")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          tipo_evento: "Concierto",
          nombre_evento: "Evento Test",
          // Faltan campos
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Faltan datos obligatorios");
    });
  });

  describe("Pruebas de seguridad adicionales", () => {
    it("debería manejar inyección SQL en campos de texto", async () => {
      const maliciousData = {
        id_lugar: 1,
        tipo_evento: "Concierto'; DROP TABLE eventos; --",
        nombre_evento: "<script>alert('XSS')</script>",
        capacidad: 100,
        horario_inicio: "2024-12-01 20:00:00",
        horario_fin: "2024-12-01 23:00:00",
      };

      const response = await request(app)
        .post("/api/events")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(maliciousData);

      // No debería crashear el servidor
      expect(response.status).not.toBe(500);
    });
  });
});

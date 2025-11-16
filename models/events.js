const db = require("../config/config");

const Event = {};

Event.create = async (event) => {
  const query = `
    CALL CreateEventWithSeats(?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await db.execute(query, [
    event.id_lugar,
    event.tipo_evento,
    event.nombre_evento,
    event.capacidad,
    event.horario_inicio,
    event.horario_fin,
    event.restricciones || null, // Use provided restricciones or null
    event.id_sala || null,
  ]);

  return result;
};

Event.findAll = async () => {
  const query = `
    SELECT 
      e.*,
      l.nombre as lugar_nombre,
      l.ubicacion,
      (SELECT SUM(capacidad_total) FROM secciones_eventos WHERE evento_id = e.id) as capacidad_total,
      (SELECT SUM(asientos_ocupados) FROM secciones_eventos WHERE evento_id = e.id) as asientos_ocupados
    FROM eventos e
    JOIN lugares l ON e.id_lugar = l.id
    WHERE e.activo = 1
    ORDER BY e.horario_inicio DESC
  `;

  const [rows] = await db.execute(query);
  return rows;
};

Event.findById = async (id) => {
  const query = `
    SELECT 
      e.*,
      l.nombre as lugar_nombre,
      l.ubicacion,
      l.tipo_lugar,
      (SELECT SUM(capacidad_total) FROM secciones_eventos WHERE evento_id = e.id) as capacidad_total,
      (SELECT SUM(asientos_ocupados) FROM secciones_eventos WHERE evento_id = e.id) as asientos_ocupados
    FROM eventos e
    JOIN lugares l ON e.id_lugar = l.id
    WHERE e.id = ?
  `;

  const [rows] = await db.execute(query, [id]);
  return rows.length > 0 ? rows[0] : null;
};

Event.update = async (id, eventData) => {
  const allowedFields = [
    "id_lugar",
    "tipo_evento",
    "nombre_evento",
    "capacidad",
    "horario_inicio",
    "horario_fin",
    "restricciones",
    "activo",
  ];

  const updates = [];
  const values = [];

  Object.keys(eventData).forEach((key) => {
    if (allowedFields.includes(key)) {
      updates.push(`${key} = ?`);
      values.push(eventData[key]);
    }
  });

  if (updates.length === 0) {
    throw new Error("No valid fields to update");
  }

  values.push(id);

  const query = `
    UPDATE eventos 
    SET ${updates.join(", ")} 
    WHERE id = ?
  `;

  const [result] = await db.execute(query, values);
  return result;
};

Event.deactivate = async (id) => {
  const query = "UPDATE eventos SET activo = 0 WHERE id = ?";
  const [result] = await db.execute(query, [id]);
  return result;
};

Event.deleteById = async (eventId) => {
  const query = "DELETE FROM eventos WHERE id = ?";
  const [result] = await db.execute(query, [eventId]);
  return result;
};

module.exports = Event;

const db = require("../config/config");

const Theater = {};

Theater.getSeatsByEventId = async (eventId) => {
  try {
    const query = `
      SELECT 
        se.nombre_seccion,
        se.subseccion,
        se.filas,
        se.columnas,
        cb.precio_base as precio,
        GROUP_CONCAT(CONCAT(a.fila, ',', a.columna)) as ocupados
      FROM secciones_eventos se
      JOIN categorias_boletos cb ON se.categoria_boleto_id = cb.id
      LEFT JOIN asientos a ON a.seccion_evento_id = se.id AND a.estado = 'ocupado'
      WHERE se.evento_id = ?
      GROUP BY se.id, se.nombre_seccion, se.subseccion, se.filas, se.columnas, cb.precio_base
      ORDER BY 
        CASE 
          WHEN se.nombre_seccion = 'General' THEN 1
          WHEN se.nombre_seccion = 'Platea' THEN 2
          WHEN se.nombre_seccion = 'Palco' THEN 3
          WHEN se.nombre_seccion = 'Balcon' THEN 4
          ELSE 5
        END,
        se.subseccion
    `;

    const [rows] = await db.execute(query, [eventId]);
    return rows;
  } catch (error) {
    console.error("Error in Theater.getSeatsByEventId model:", error);
    throw error; // Re-throw the error to be handled in controller
  }
};

Theater.findByTheaterId = async (theaterId) => {
  const query =
    "SELECT E.id, E.nombre_evento, E.horario_inicio, E.horario_fin, E.tipo_evento, L.ubicacion FROM eventos E INNER JOIN lugares L ON L.id = E.id_lugar WHERE L.id = ?";
  const [rows] = await db.execute(query, [theaterId]);
  return rows;
};

module.exports = Theater;

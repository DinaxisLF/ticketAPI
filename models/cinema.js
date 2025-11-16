const db = require("../config/config");

const Cinema = {};

Cinema.getRoomTypes = async () => {
  const query = `
    SELECT * FROM salas;
    `;
  const [rooms] = await db.execute(query);

  return rooms;
};

Cinema.getCategories = async () => {
  const query = `
    select id, nombre_categoria, precio_base from categorias_boletos where tipo_evento = "Cine" ORDER BY id
    `;
  const [categories] = await db.execute(query);
  return categories;
};

Cinema.findByCinemaRoom = async (roomType, cinemaId) => {
  const query = `SELECT
      E.id,
      E.nombre_evento,
      E.horario_inicio,
      E.horario_fin,
      E.tipo_evento,
      L.ubicacion,
      S.nombre_seccion
    FROM
      eventos E
      INNER JOIN lugares L ON L.id = E.id_lugar
      INNER JOIN secciones_eventos S ON S.evento_id = E.id AND S.nombre_seccion = ?
    WHERE
      L.id = ?;`;
  const [rows] = await db.execute(query, [roomType, cinemaId]);
  return rows;
};

Cinema.getSeatsByRoomEventId = async (eventId) => {
  const query = ` 
    SELECT 
      se.nombre_seccion,
      se.subseccion,
      se.filas,
      se.columnas,
      cb.precio_base as precio,
      cb.nombre_categoria,
      GROUP_CONCAT(CONCAT(a.fila, ',', a.columna) SEPARATOR '|') as ocupados
    FROM secciones_eventos se
    JOIN categorias_boletos cb ON se.categoria_boleto_id = cb.id
    JOIN eventos e ON se.evento_id = e.id
    LEFT JOIN asientos a ON a.seccion_evento_id = se.id AND a.estado = 'ocupado'
    WHERE se.evento_id = ? AND e.tipo_evento = 'Cine'
    GROUP BY se.id, se.nombre_seccion, se.subseccion, se.filas, se.columnas, cb.precio_base, cb.nombre_categoria`;

  const [rows] = await db.execute(query, [eventId]);

  // Add debug logging
  console.log("🔍 MODEL - Raw database results:");
  rows.forEach((row) => {
    console.log(`   Sección: ${row.nombre_seccion}`);
    console.log(`   Ocupados raw: "${row.ocupados}"`);
    console.log(`   Tipo: ${typeof row.ocupados}`);
  });

  return rows;
};

module.exports = Cinema;

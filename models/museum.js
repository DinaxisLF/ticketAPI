const db = require("../config/config");

const Museum = {};

Museum.getMuseumAvailiability = async (museumId) => {
  const query = `
  SELECT 
    e.id,
    e.nombre_evento,
    e.capacidad,
    se.capacidad_total,
    se.asientos_ocupados,
    (se.capacidad_total - COALESCE(se.asientos_ocupados, 0)) as espacios_disponibles,
    cb.precio_base as precio,
    l.nombre as lugar_nombre,
    l.ubicacion
  FROM eventos e
  JOIN secciones_eventos se ON e.id = se.evento_id
  JOIN categorias_boletos cb ON se.categoria_boleto_id = cb.id
  JOIN lugares l ON e.id_lugar = l.id
  WHERE e.id_lugar = ? AND e.tipo_evento = 'Museo'
`;

  const [rows] = await db.execute(query, [museumId]);
  return rows.length > 0 ? rows[0] : null;
};

module.exports = Museum;

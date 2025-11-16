const db = require("../config/config");

const Transaction = {};

// Updated Transaction.create for new schema
Transaction.create = async (transactionData, connection) => {
  const {
    usuario_id,
    evento_id,
    metodo_pago,
    total_pagado,
    asientos_seleccionados,
    fecha_visita,
  } = transactionData;

  const query = `
    INSERT INTO transacciones (
      usuario_id, evento_id, metodo_pago, 
      total_pagado, estado, asientos_seleccionados, fecha_visita
    ) VALUES (?, ?, ?, ?, 'completada', ?, ?)
  `;

  const asientosJSON = Array.isArray(asientos_seleccionados)
    ? JSON.stringify(asientos_seleccionados)
    : asientos_seleccionados;

  const [result] = await connection.execute(query, [
    usuario_id,
    evento_id,
    metodo_pago,
    total_pagado,
    asientosJSON,
    fecha_visita, // Puede ser null para eventos que no son museo
  ]);

  return result.insertId;
};

//Method to create transaction details
Transaction.createDetails = async (
  transactionId,
  transactionDetails,
  connection
) => {
  const query = `
    INSERT INTO detalles_transaccion (
      transaccion_id, categoria_boleto_id, cantidad, 
      precio_unitario, subtotal
    ) VALUES (?, ?, ?, ?, ?)
  `;

  // Process all ticket details
  for (const detail of transactionDetails) {
    const { categoria_boleto_id, cantidad, precio_unitario, subtotal } = detail;

    await connection.execute(query, [
      transactionId,
      categoria_boleto_id,
      cantidad,
      precio_unitario,
      subtotal,
    ]);
  }
};

Transaction.obtainCompleteTransaction = async (transactionId, connection) => {
  const query = `
    SELECT 
      t.*,
      l.nombre as lugar_nombre,
      l.ubicacion,
      e.nombre_evento,
      e.horario_inicio,
      u.nombre as usuario_nombre,
      u.correo as usuario_correo,
      JSON_ARRAYAGG(
        JSON_OBJECT(
          'categoria_boleto_id', dt.categoria_boleto_id,
          'cantidad', dt.cantidad,
          'precio_unitario', dt.precio_unitario,
          'subtotal', dt.subtotal,
          'nombre_categoria', cb.nombre_categoria
        )
      ) as detalles
    FROM transacciones t
    JOIN eventos e ON t.evento_id = e.id
    JOIN lugares l ON e.id_lugar = l.id
    JOIN users u ON t.usuario_id = u.id
    LEFT JOIN detalles_transaccion dt ON t.id = dt.transaccion_id
    LEFT JOIN categorias_boletos cb ON dt.categoria_boleto_id = cb.id
    WHERE t.id = ?
    GROUP BY t.id
  `;

  const [rows] = await connection.execute(query, [transactionId]);
  return rows.length > 0 ? rows[0] : null;
};

Transaction.obtainSectionByEventId = async (
  evento_id,
  seccion_key,
  connection
) => {
  console.log(
    `🔍 Buscando sección: evento_id=${evento_id}, seccion_key=${seccion_key}`
  );

  // Para balcones, usar subsecciones (CORREGIDO)
  if (
    seccion_key.toLowerCase() === "balconizquierdo" ||
    seccion_key.toLowerCase() === "balconderecho"
  ) {
    console.log(`🔍 Buscando sección Balcón con subsección...`);

    const query = `
      SELECT id FROM secciones_eventos 
      WHERE evento_id = ? AND nombre_seccion = 'Balcon' AND subseccion = ?
    `;

    const subseccion =
      seccion_key.toLowerCase() === "balconizquierdo" ? "Izquierdo" : "Derecho";
    console.log(`🎯 Buscando: Balcon + subseccion=${subseccion}`);

    const [secciones] = await connection.execute(query, [
      evento_id,
      subseccion,
    ]);

    const found = secciones.length > 0;
    console.log(
      `🎯 Sección Balcón ${subseccion} ${
        found ? "ENCONTRADA" : "NO ENCONTRADA"
      }:`,
      found ? secciones[0].id : "N/A"
    );

    if (found) {
      return secciones[0].id;
    } else {
      console.log(
        `❌ No se encontró Balcón ${subseccion}, revisando todas las secciones disponibles...`
      );

      // Debug: Ver todas las secciones del evento
      const debugQuery = `
        SELECT id, nombre_seccion, subseccion 
        FROM secciones_eventos 
        WHERE evento_id = ?
      `;
      const [allSections] = await connection.execute(debugQuery, [evento_id]);
      console.log("📋 Todas las secciones disponibles:", allSections);

      return null;
    }
  }

  // Para otras secciones, usar el mapeo normal
  const sectionMappings = {
    general: "General",
    platea: "Platea",
    palco: "Palco",
    balcon: "Balcon",
    // ... resto de mapeos de cine
  };

  const properSectionName =
    sectionMappings[seccion_key.toLowerCase()] || seccion_key;
  console.log(`📋 Mapeando '${seccion_key}' -> '${properSectionName}'`);

  const query = `
    SELECT id FROM secciones_eventos 
    WHERE evento_id = ? AND nombre_seccion = ?
  `;

  const [secciones] = await connection.execute(query, [
    evento_id,
    properSectionName,
  ]);

  const found = secciones.length > 0;
  console.log(
    `🎯 Sección ${found ? "ENCONTRADA" : "NO ENCONTRADA"}:`,
    found ? secciones[0].id : "N/A"
  );

  return found ? secciones[0].id : null;
};

Transaction.updateSeat = async (
  TransactionId,
  seccionEventoId,
  fila,
  columna,
  connection
) => {
  const query = `
    UPDATE asientos 
    SET estado = 'ocupado', transaccion_id = ?
    WHERE seccion_evento_id = ? AND fila = ? AND columna = ?
    AND estado = 'disponible'
  `;

  const [result] = await connection.execute(query, [
    TransactionId,
    seccionEventoId,
    fila,
    columna,
  ]);

  return result.affectedRows;
};

Transaction.updateSectionCounter = async (
  seccionEventoId,
  cantidad,
  connection
) => {
  const query = `
    UPDATE secciones_eventos 
    SET asientos_ocupados = asientos_ocupados + ?
    WHERE id = ?
  `;

  await connection.execute(query, [cantidad, seccionEventoId]);
};

Transaction.updateMuseoAvailability = async (eventId, quantity, connection) => {
  const query = `
    UPDATE secciones_eventos 
    SET asientos_ocupados = asientos_ocupados + ?
    WHERE evento_id = ? AND nombre_seccion = 'Entrada General'
  `;

  const [result] = await connection.execute(query, [quantity, eventId]);
  return result.affectedRows > 0;
};

Transaction.obtainTransactionsByUser = async (usuario_id) => {
  // First get the main transactions
  const queryTransactions = `
    SELECT 
      t.*,
      e.nombre_evento,
      e.horario_inicio,
      l.nombre as lugar_nombre,
      l.ubicacion,
      u.nombre as usuario_nombre
    FROM transacciones t
    JOIN eventos e ON t.evento_id = e.id
    JOIN lugares l ON e.id_lugar = l.id
    JOIN users u ON t.usuario_id = u.id
    WHERE t.usuario_id = ?
    ORDER BY t.fecha_transaccion DESC
  `;

  const [transacciones] = await db.execute(queryTransactions, [usuario_id]);

  // Then get details for each transaction
  const transaccionesConDetalles = await Promise.all(
    transacciones.map(async (transaccion) => {
      const queryDetails = `
        SELECT 
          dt.*,
          cb.nombre_categoria,
          cb.tipo_evento
        FROM detalles_transaccion dt
        JOIN categorias_boletos cb ON dt.categoria_boleto_id = cb.id
        WHERE dt.transaccion_id = ?
      `;

      const [detalles] = await db.execute(queryDetails, [transaccion.id]);

      return {
        ...transaccion,
        detalles_boletos: detalles,
        total_boletos: detalles.reduce(
          (sum, detalle) => sum + detalle.cantidad,
          0
        ),
        total_tipos_boletos: detalles.length,
      };
    })
  );

  return transaccionesConDetalles;
};

Transaction.obtainAllTransactions = async () => {
  const query = `
    SELECT 
      t.*,
      e.nombre_evento,
      e.horario_inicio,
      l.nombre as lugar_nombre,
      u.nombre as usuario_nombre,
      COUNT(dt.id) as total_tipos_boletos,
      SUM(dt.cantidad) as total_boletos
    FROM transacciones t
    JOIN eventos e ON t.evento_id = e.id
    JOIN lugares l ON e.id_lugar = l.id
    JOIN users u ON t.usuario_id = u.id
    LEFT JOIN detalles_transaccion dt ON t.id = dt.transaccion_id
    GROUP BY t.id
    ORDER BY t.fecha_transaccion DESC
  `;

  const [transacciones] = await db.execute(query);
  return transacciones;
};

module.exports = Transaction;

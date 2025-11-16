const Transaction = require("../models/transaction");
const db = require("../config/config");

module.exports = {
  async createTransaction(req, res, next) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const {
        usuario_id,
        evento_id,
        metodo_pago,
        total_pagado,
        asientos_seleccionados,
        secciones_info,
        ticket_details,
        tipo_evento,
      } = req.body;

      console.log("Datos recibidos para transacción:", req.body);

      // Add Museo-specific validation
      if (tipo_evento === "Museo") {
        if (
          !ticket_details ||
          !Array.isArray(ticket_details) ||
          ticket_details.length === 0
        ) {
          await connection.rollback();
          return res.status(400).json({
            error:
              "Para eventos de Museo, se requieren los detalles de los boletos",
          });
        }
      } else {
        if (
          !usuario_id ||
          !evento_id ||
          !metodo_pago ||
          !total_pagado ||
          !ticket_details ||
          !Array.isArray(ticket_details) ||
          ticket_details.length === 0
        ) {
          await connection.rollback();
          return res.status(400).json({
            error: "Datos incompletos para la transacción",
            required_fields: {
              usuario_id: !!usuario_id,
              evento_id: !!evento_id,
              metodo_pago: !!metodo_pago,
              total_pagado: !!total_pagado,
              ticket_details:
                !!ticket_details &&
                Array.isArray(ticket_details) &&
                ticket_details.length > 0,
            },
          });
        }
      }

      // Validate each ticket detail
      for (const detail of ticket_details) {
        if (
          !detail.categoria_boleto_id ||
          !detail.cantidad ||
          !detail.precio_unitario ||
          !detail.subtotal
        ) {
          await connection.rollback();
          return res.status(400).json({
            error: "Datos incompletos en los detalles de los boletos",
            invalid_detail: detail,
          });
        }
      }

      // 1. Create the main transaction
      const transactionId = await Transaction.create(
        {
          usuario_id,
          evento_id,
          metodo_pago,
          total_pagado,
          asientos_seleccionados:
            tipo_evento === "Museo" ? [] : asientos_seleccionados,
          fecha_visita: tipo_evento === "Museo" ? new Date() : null,
        },
        connection
      );

      console.log("Transacción principal creada con ID:", transactionId);

      // 2. Create transaction details for each ticket type
      await Transaction.createDetails(
        transactionId,
        ticket_details,
        connection
      );
      console.log(
        "Detalles de transacción creados para",
        ticket_details.length,
        "tipos de boletos"
      );

      // 3. Handle different event types - FIXED METHOD CALL
      if (tipo_evento === "Museo") {
        // Calculate total quantity and update museum availability
        const totalQuantity = ticket_details.reduce(
          (sum, detail) => sum + detail.cantidad,
          0
        );
        await module.exports.updateMuseoAvailability(
          evento_id,
          totalQuantity,
          connection
        );
      } else {
        // Handle Teatro/Cine events - update seats
        await module.exports.handleSeatedEvent(
          evento_id,
          secciones_info,
          transactionId,
          connection
        );
      }

      // 4. Confirm transaction
      await connection.commit();

      // 5. Get complete transaction data with details
      const transactionCompleta = await Transaction.obtainCompleteTransaction(
        transactionId,
        connection
      );

      res.status(201).json({
        success: true,
        message: "Transacción registrada exitosamente",
        transaction: transactionCompleta,
        transaction_id: transactionId,
      });
    } catch (error) {
      await connection.rollback();
      console.error("Error en transacción:", error);
      res.status(500).json({
        error: "Error interno del servidor",
        details: error.message,
      });
    } finally {
      connection.release();
    }
  },

  async handleMuseoTransaction(evento_id, ticket_details, connection) {
    try {
      console.log(`🎭 Procesando transacción para evento Museo: ${evento_id}`);

      // Calculate total quantity from all ticket details
      const totalQuantity = ticket_details.reduce(
        (sum, detail) => sum + detail.cantidad,
        0
      );

      console.log(
        `📊 Actualizando disponibilidad del museo: +${totalQuantity} entradas`
      );

      // Update museum availability
      const updated = await Transaction.updateMuseoAvailability(
        evento_id,
        totalQuantity,
        connection
      );

      if (!updated) {
        throw new Error("No se pudo actualizar la disponibilidad del museo");
      }

      console.log(`✅ Disponibilidad del museo actualizada exitosamente`);
    } catch (error) {
      console.error("❌ Error procesando transacción de museo:", error);
      throw error;
    }
  },

  async handleSeatedEvent(
    evento_id,
    secciones_info,
    transactionId,
    connection
  ) {
    try {
      console.log(
        `🎭 Procesando transacción para evento con asientos: ${evento_id}`
      );

      if (secciones_info && secciones_info.length > 0) {
        for (const seccionInfo of secciones_info) {
          const { seccion_key, asientos } = seccionInfo;

          console.log(
            `🔄 Procesando sección: ${seccion_key} con ${asientos.length} asientos`
          );

          const seccionEventoId = await Transaction.obtainSectionByEventId(
            evento_id,
            seccion_key,
            connection
          );

          if (!seccionEventoId) {
            console.error(
              `❌ CRÍTICO: Sección no encontrada: ${seccion_key} para evento ${evento_id}`
            );

            const checkQuery = `
            SELECT id, nombre_seccion, subseccion 
            FROM secciones_eventos 
            WHERE evento_id = ?
          `;
            const [existingSections] = await connection.execute(checkQuery, [
              evento_id,
            ]);

            console.error(
              `📊 Secciones existentes para evento ${evento_id}:`,
              existingSections
            );

            throw new Error(`Sección no encontrada: ${seccion_key}`);
          }

          let asientosActualizados = 0;
          for (const asiento of asientos) {
            const { fila, columna } = asiento;

            console.log(
              `💺 Actualizando asiento: seccion_id=${seccionEventoId}, fila=${fila}, columna=${columna}`
            );

            const affectedRows = await Transaction.updateSeat(
              transactionId,
              seccionEventoId,
              fila,
              columna,
              connection
            );

            if (affectedRows > 0) {
              asientosActualizados++;
              console.log(
                `✅ Asiento actualizado: fila=${fila}, columna=${columna}`
              );
            } else {
              console.warn(
                `⚠️  Asiento no pudo ser actualizado: fila=${fila}, columna=${columna}`
              );

              const seatCheckQuery = `
              SELECT estado, transaccion_id 
              FROM asientos 
              WHERE seccion_evento_id = ? AND fila = ? AND columna = ?
            `;
              const [seatStatus] = await connection.execute(seatCheckQuery, [
                seccionEventoId,
                fila,
                columna,
              ]);
              console.warn(`ℹ️  Estado actual del asiento:`, seatStatus[0]);
            }
          }

          if (asientosActualizados > 0) {
            await Transaction.updateSectionCounter(
              seccionEventoId,
              asientosActualizados,
              connection
            );
            console.log(
              `📈 Contador actualizado: +${asientosActualizados} asientos para sección ${seccion_key}`
            );
          }

          console.log(
            `🎉 Finalizado: ${asientosActualizados}/${asientos.length} asientos actualizados para ${seccion_key}`
          );
        }
      }
    } catch (error) {
      console.error("❌ Error procesando evento con asientos:", error);
      throw error;
    }
  },

  async transactionByUserId(req, res, next) {
    try {
      const { usuario_id } = req.params;

      const Transactiones = await Transaction.obtainTransactionsByUser(
        usuario_id
      );

      res.json({
        Transactiones: Transactiones,
      });
    } catch (error) {
      console.error("Error obteniendo Transactiones:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  },

  async getCompleteTransaction(req, res, next) {
    const connection = await db.getConnection();

    try {
      const transactionId = req.params.id;

      if (!transactionId || isNaN(transactionId)) {
        return res.status(400).json({
          success: false,
          error: "ID de transacción válido es requerido",
        });
      }

      console.log(`Obteniendo transacción completa para ID: ${transactionId}`);

      const transactionCompleta = await Transaction.obtainCompleteTransaction(
        parseInt(transactionId),
        connection
      );

      if (!transactionCompleta) {
        return res.status(404).json({
          success: false,
          error: `Transacción con ID ${transactionId} no encontrada`,
        });
      }

      // Improved JSON parsing that handles both strings and objects
      const parseJsonField = (field, defaultValue = []) => {
        if (!field) return defaultValue;

        // If it's already an object/array, return it directly
        if (typeof field === "object") {
          return field;
        }

        // If it's a string, try to parse it as JSON
        if (typeof field === "string") {
          try {
            return JSON.parse(field);
          } catch (error) {
            console.warn(`Error parsing JSON field:`, error);
            return defaultValue;
          }
        }

        return defaultValue;
      };

      // Format the response data
      const formattedTransaction = {
        // Transaction basic info
        id: transactionCompleta.id,
        usuario_id: transactionCompleta.usuario_id,
        evento_id: transactionCompleta.evento_id,
        metodo_pago: transactionCompleta.metodo_pago,
        total_pagado: parseFloat(transactionCompleta.total_pagado),
        estado: transactionCompleta.estado,
        fecha_transaccion: transactionCompleta.fecha_transaccion,
        referencia_pago: transactionCompleta.referencia_pago,

        // Parsed JSON fields
        asientos_seleccionados: parseJsonField(
          transactionCompleta.asientos_seleccionados
        ),

        // Event details
        evento: {
          nombre: transactionCompleta.nombre_evento,
          horario_inicio: transactionCompleta.horario_inicio,
        },

        // Place details
        lugar: {
          nombre: transactionCompleta.lugar_nombre,
          ubicacion: transactionCompleta.ubicacion,
        },

        // User details
        usuario: {
          nombre: transactionCompleta.usuario_nombre,
          correo: transactionCompleta.usuario_correo,
        },

        // Ticket details
        boletos: {
          detalles: parseJsonField(transactionCompleta.detalles),
          resumen: {
            total_boletos: 0,
            total_categorias: 0,
            desglose: {},
          },
        },
      };

      // Calculate summary for tickets
      if (
        formattedTransaction.boletos.detalles &&
        formattedTransaction.boletos.detalles.length > 0
      ) {
        formattedTransaction.boletos.resumen.total_categorias =
          formattedTransaction.boletos.detalles.length;
        formattedTransaction.boletos.resumen.total_boletos =
          formattedTransaction.boletos.detalles.reduce(
            (total, detalle) => total + detalle.cantidad,
            0
          );

        // Create breakdown by category
        formattedTransaction.boletos.detalles.forEach((detalle) => {
          formattedTransaction.boletos.resumen.desglose[
            detalle.nombre_categoria
          ] = {
            cantidad: detalle.cantidad,
            precio_unitario: parseFloat(detalle.precio_unitario),
            subtotal: parseFloat(detalle.subtotal),
          };
        });
      }

      console.log(`Transacción ${transactionId} obtenida exitosamente`);

      res.json({
        success: true,
        message: "Transacción obtenida exitosamente",
        data: formattedTransaction,
      });
    } catch (error) {
      console.error("Error en getCompleteTransaction:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor al obtener la transacción",
        details: error.message,
      });
    } finally {
      connection.release();
    }
  },

  async getAllTransactions(req, res, next) {
    try {
      // Get query parameters for filtering and pagination
      const {
        page = 1,
        limit = 50,
        estado,
        metodo_pago,
        usuario_id,
        evento_id,
        fecha_desde,
        fecha_hasta,
      } = req.query;

      console.log("Obteniendo transacciones con filtros:", req.query);

      // For now, we'll get all transactions and filter in code
      // In a production app, you'd modify the SQL query to include these filters
      let transacciones = await Transaction.obtainAllTransactions();

      // Apply filters
      if (estado) {
        transacciones = transacciones.filter((t) => t.estado === estado);
      }
      if (metodo_pago) {
        transacciones = transacciones.filter(
          (t) => t.metodo_pago === metodo_pago
        );
      }
      if (usuario_id) {
        transacciones = transacciones.filter(
          (t) => t.usuario_id === parseInt(usuario_id)
        );
      }
      if (evento_id) {
        transacciones = transacciones.filter(
          (t) => t.evento_id === parseInt(evento_id)
        );
      }
      if (fecha_desde) {
        const desde = new Date(fecha_desde);
        transacciones = transacciones.filter(
          (t) => new Date(t.fecha_transaccion) >= desde
        );
      }
      if (fecha_hasta) {
        const hasta = new Date(fecha_hasta);
        transacciones = transacciones.filter(
          (t) => new Date(t.fecha_transaccion) <= hasta
        );
      }

      // Apply pagination
      const pageInt = parseInt(page);
      const limitInt = parseInt(limit);
      const startIndex = (pageInt - 1) * limitInt;
      const endIndex = startIndex + limitInt;

      const transaccionesPaginadas = transacciones.slice(startIndex, endIndex);

      // Format the response
      const formattedTransactions = transaccionesPaginadas.map(
        (transaccion) => ({
          id: transaccion.id,
          usuario_id: transaccion.usuario_id,
          evento_id: transaccion.evento_id,
          metodo_pago: transaccion.metodo_pago,
          total_pagado: parseFloat(transaccion.total_pagado),
          estado: transaccion.estado,
          fecha_transaccion: transaccion.fecha_transaccion,
          referencia_pago: transaccion.referencia_pago,
          nombre_evento: transaccion.nombre_evento,
          horario_inicio: transaccion.horario_inicio,
          lugar_nombre: transaccion.lugar_nombre,
          usuario_nombre: transaccion.usuario_nombre,
          total_tipos_boletos: parseInt(transaccion.total_tipos_boletos) || 0,
          total_boletos: parseInt(transaccion.total_boletos) || 0,
        })
      );

      // Calculate statistics for the filtered results
      const estadisticas = {
        total_transacciones: transacciones.length,
        total_filtradas: formattedTransactions.length,
        total_ingresos: transacciones.reduce(
          (sum, t) => sum + parseFloat(t.total_pagado),
          0
        ),
        total_boletos_vendidos: transacciones.reduce(
          (sum, t) => sum + (parseInt(t.total_boletos) || 0),
          0
        ),
        transacciones_por_estado: transacciones.reduce((acc, t) => {
          acc[t.estado] = (acc[t.estado] || 0) + 1;
          return acc;
        }, {}),
        transacciones_por_metodo_pago: transacciones.reduce((acc, t) => {
          acc[t.metodo_pago] = (acc[t.metodo_pago] || 0) + 1;
          return acc;
        }, {}),
      };

      console.log(
        `Se obtuvieron ${formattedTransactions.length} transacciones (${transacciones.length} total con filtros)`
      );

      res.json({
        success: true,
        message: "Transacciones obtenidas exitosamente",
        data: {
          transacciones: formattedTransactions,
          estadisticas: estadisticas,
          pagination: {
            page: pageInt,
            limit: limitInt,
            total: transacciones.length,
            pages: Math.ceil(transacciones.length / limitInt),
            hasNext: endIndex < transacciones.length,
            hasPrev: startIndex > 0,
          },
          filters: {
            estado,
            metodo_pago,
            usuario_id,
            evento_id,
            fecha_desde,
            fecha_hasta,
          },
        },
      });
    } catch (error) {
      console.error("Error obteniendo todas las transacciones:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor al obtener las transacciones",
        details: error.message,
      });
    }
  },

  async updateMuseoAvailability(eventId, quantity, connection) {
    const query = `
      UPDATE secciones_eventos 
      SET asientos_ocupados = asientos_ocupados + ?
      WHERE evento_id = ? AND nombre_seccion = 'Entrada General'
    `;

    console.log(
      `🎭 Actualizando museo: evento=${eventId}, cantidad=${quantity}`
    );

    const [result] = await connection.execute(query, [quantity, eventId]);

    if (result.affectedRows > 0) {
      console.log(`✅ Museo actualizado: +${quantity} entradas`);
      return true;
    } else {
      console.error(`❌ No se pudo actualizar el museo`);
      return false;
    }
  },
};

const Museum = require("../models/museum");

module.exports = {
  async getMuseoAvailability(req, res) {
    try {
      const eventId = req.params.id;

      console.log("Fetching museum availability for event ID:", eventId);

      const availability = await Museum.getMuseumAvailiability(eventId);

      if (!availability) {
        return res.status(404).json({
          success: false,
          message: "Evento de museo no encontrado",
        });
      }

      res.status(200).json({
        success: true,
        data: {
          event_id: availability.id,
          nombre_evento: availability.nombre_evento,
          lugar: availability.lugar_nombre,
          ubicacion: availability.ubicacion,
          capacidad_total: availability.capacidad_total,
          asientos_ocupados: availability.asientos_ocupados || 0,
          espacios_disponibles: availability.espacios_disponibles,
          precio: availability.precio,
          horario_inicio: availability.horario_inicio,
          horario_fin: availability.horario_fin,
          disponible: availability.espacios_disponibles > 0,
        },
      });
    } catch (error) {
      console.error("Error al obtener disponibilidad del museo:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener disponibilidad",
        error: error.message,
      });
    }
  },
};

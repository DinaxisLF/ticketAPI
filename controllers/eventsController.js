const { get } = require("../app");
const Event = require("../models/events");

module.exports = {
  async createEvent(req, res) {
    const event = req.body;

    if (
      !event.id_lugar ||
      !event.tipo_evento ||
      !event.nombre_evento ||
      !event.capacidad ||
      !event.horario_inicio ||
      !event.horario_fin
    ) {
      return res.status(400).json({ message: "Faltan datos obligatorios" });
    }

    try {
      const result = await Event.create(event);

      if (result && result[0] && result[0][0]) {
        const newEventId = result[0][0].new_event_id;

        return res.status(201).json({
          message:
            "Evento creado exitosamente con todas las secciones y asientos",
          event_id: newEventId,
        });
      } else {
        return res.status(500).json({ message: "No se pudo crear el evento" });
      }
    } catch (error) {
      console.error("Error al crear evento:", error);
      return res.status(500).json({
        message: "Error al crear evento",
        error: error.message,
      });
    }
  },

  async getAllEvents(req, res) {
    try {
      const events = await Event.findAll();

      res.json({
        success: true,
        count: events.length,
        events: events,
      });
    } catch (error) {
      console.error("Error al obtener eventos:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener eventos",
        error: error.message,
      });
    }
  },

  async getEventById(req, res) {
    try {
      const eventId = req.params.id;
      const event = await Event.findById(eventId);

      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Evento no encontrado",
        });
      }

      res.json({
        success: true,
        event: event,
      });
    } catch (error) {
      console.error("Error al obtener evento:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener evento",
        error: error.message,
      });
    }
  },

  async updateEvent(req, res) {
    try {
      const eventId = req.params.id;
      const eventData = req.body;

      // Check if event exists
      const existingEvent = await Event.findById(eventId);
      if (!existingEvent) {
        return res.status(404).json({
          success: false,
          message: "Evento no encontrado",
        });
      }

      const result = await Event.update(eventId, eventData);

      if (result.affectedRows === 0) {
        return res.status(400).json({
          success: false,
          message: "No se pudo actualizar el evento",
        });
      }

      res.json({
        success: true,
        message: "Evento actualizado exitosamente",
        affectedRows: result.affectedRows,
      });
    } catch (error) {
      console.error("Error al actualizar evento:", error);
      res.status(500).json({
        success: false,
        message: "Error al actualizar evento",
        error: error.message,
      });
    }
  },

  async deactivateEvent(req, res) {
    try {
      const eventId = req.params.id;

      // Check if event exists
      const existingEvent = await Event.findById(eventId);
      if (!existingEvent) {
        return res.status(404).json({
          success: false,
          message: "Evento no encontrado",
        });
      }

      const result = await Event.deactivate(eventId);

      res.json({
        success: true,
        message: "Evento desactivado exitosamente",
        affectedRows: result.affectedRows,
      });
    } catch (error) {
      console.error("Error al desactivar evento:", error);
      res.status(500).json({
        success: false,
        message: "Error al desactivar evento",
        error: error.message,
      });
    }
  },

  async deleteEvent(req, res) {
    try {
      const eventId = req.params.id;

      // Check if event exists
      const existingEvent = await Event.findById(eventId);
      if (!existingEvent) {
        return res.status(404).json({
          success: false,
          message: "Evento no encontrado",
        });
      }

      const result = await Event.deleteById(eventId);

      res.json({
        success: true,
        message: "Evento eliminado exitosamente",
        affectedRows: result.affectedRows,
      });
    } catch (error) {
      console.error("Error al eliminar evento:", error);
      res.status(500).json({
        success: false,
        message: "Error al eliminar evento",
        error: error.message,
      });
    }
  },
};

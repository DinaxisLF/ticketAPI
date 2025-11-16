const Cinema = require("../models/cinema");

module.exports = {
  async getRoomTypes(req, res) {
    try {
      const rooms = await Cinema.getRoomTypes();
      res.status(200).json({
        success: true,
        rooms: rooms,
      });
    } catch (error) {
      console.error("Error al obtener tipos de sala:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener tipos de sala",
        error: error.message,
      });
    }
  },

  async getCategories(req, res) {
    try {
      const categories = await Cinema.getCategories();
      res.status(200).json({
        success: true,
        categories: categories,
      });
    } catch (error) {
      console.error("Error al obtener categorías:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener categorías",
        error: error.message,
      });
    }
  },

  async getEventsByCinemaRoom(req, res) {
    try {
      const { roomType, cinemaId } = req.params;
      const events = await Cinema.findByCinemaRoom(roomType, cinemaId);
      res.status(200).json({
        success: true,
        events: events,
      });
    } catch (error) {
      console.error("Error al obtener eventos por sala de cine:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener eventos por sala de cine",
        error: error.message,
      });
    }
  },

  // In your controller
  async getSeatsByEventId(req, res) {
    try {
      const eventId = req.params.id;
      const sections = await Cinema.getSeatsByRoomEventId(eventId);

      // Transform the sections to properly format occupied seats
      const transformedSections = sections.map((section) => {
        let ocupados = [];

        if (section.ocupados && typeof section.ocupados === "string") {
          try {
            // Handle the string format "1,1" or "1,1|2,3|4,5"
            if (section.ocupados.includes("|")) {
              // Multiple coordinates
              const coordinates = section.ocupados.split("|");
              ocupados = coordinates.map((coord) => {
                const [fila, columna] = coord.split(",").map(Number);
                return [fila, columna];
              });
            } else if (section.ocupados.includes(",")) {
              // Single coordinate
              const [fila, columna] = section.ocupados.split(",").map(Number);
              ocupados = [[fila, columna]];
            }
          } catch (error) {
            console.error("Error parsing occupied seats:", error);
            ocupados = [];
          }
        } else if (Array.isArray(section.ocupados)) {
          // Already in correct format
          ocupados = section.ocupados;
        }

        return {
          ...section,
          ocupados: ocupados,
        };
      });

      res.status(200).json({
        success: true,
        sections: transformedSections,
      });
    } catch (error) {
      console.error("Error al obtener asientos por ID de evento:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener asientos por ID de evento",
        error: error.message,
      });
    }
  },
};

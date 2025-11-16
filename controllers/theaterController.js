const Theater = require("../models/theater");

module.exports = {
  async getEventsByTeatherId(req, res, next) {
    const theaterId = req.params.id;
    try {
      const events = await Theater.findByTheaterId(theaterId);
      return res.status(200).json(events);
    } catch (error) {
      console.error("Error al obtener eventos:", error);
      return res
        .status(500)
        .json({ message: "Error al obtener eventos", error: error.message });
    }
  },

  async getSeatsByEventId(req, res, next) {
    try {
      const eventId = req.params.id;

      console.log("Received eventId:", eventId);

      // Validate eventId
      if (!eventId) {
        return res.status(400).json({ error: "Event ID is required" });
      }

      // Fix the method name - it was 'ge' instead of 'getSeatsByEventId'
      const sections = await Theater.getSeatsByEventId(eventId);

      // Validate sections
      if (!sections || !Array.isArray(sections)) {
        return res
          .status(404)
          .json({ error: "No sections found for this event" });
      }

      const sectionSeats = {};

      sections.forEach((seccion) => {
        let sectionKey;

        if (
          seccion.nombre_seccion.toLowerCase() === "balcon" &&
          seccion.subseccion
        ) {
          sectionKey = seccion.subseccion.toLowerCase().includes("izquierdo")
            ? "balconIzquierdo"
            : seccion.subseccion.toLowerCase().includes("derecho")
            ? "balconDerecho"
            : "balcon";
        } else {
          sectionKey = seccion.nombre_seccion.toLowerCase();
        }

        // Fix the occupied seats processing
        let occupied = [];
        if (seccion.ocupados) {
          // The ocupados field is already "4,1,4,2,4,3" format
          const pairs = seccion.ocupados.split(",");
          for (let i = 0; i < pairs.length; i += 2) {
            if (pairs[i + 1]) {
              occupied.push([parseInt(pairs[i]), parseInt(pairs[i + 1])]);
            }
          }
        }

        sectionSeats[sectionKey] = {
          name: seccion.nombre_seccion,
          price: parseFloat(seccion.precio),
          rows: parseInt(seccion.filas),
          cols: parseInt(seccion.columnas),
          occupied: occupied,
          subseccion: seccion.subseccion,
        };
      });

      res.json({
        sectionSeats: sectionSeats,
      });
    } catch (error) {
      console.error("Error in getSeatsByEventId controller:", error);
      res.status(500).json({
        error: "Error interno del servidor",
        details: error.message,
      });
    }
  },
};

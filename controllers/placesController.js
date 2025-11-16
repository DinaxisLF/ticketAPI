const Place = require("../models/places");

module.exports = {
  getPlacesByType: async (req, res) => {
    const type = req.params.type;
    try {
      const places = await Place.getPlaceByType(type);
      console.log("Llamada a la api");
      return res.status(200).json(places);
    } catch (error) {
      console.error("Error al obtener lugares:", error);
      return res
        .status(500)
        .json({ message: "Error al obtener lugares", error: error.message });
    }
  },
};

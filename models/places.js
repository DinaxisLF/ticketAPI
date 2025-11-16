const db = require("../config/config");

const Place = {};

Place.getPlaceByType = async (type) => {
  const query =
    "SELECT id, nombre, ubicacion FROM lugares WHERE tipo_lugar = ?";
  const [rows] = await db.execute(query, [type]);
  return rows;
};

module.exports = Place;

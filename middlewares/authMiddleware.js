const jwt = require("jsonwebtoken");
const secret = process.env.JWT_SECRET;

const authMiddleware = {};

authMiddleware.verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // <-- esto separa "Bearer <token>"

  if (!token) return res.status(403).json({ message: "Token requerido" });

  jwt.verify(token, secret, (err, decoded) => {
    if (err) return res.status(401).json({ message: "Token inválido" });
    req.user = decoded;
    next();
  });
};

authMiddleware.requireAdmin = (req, res, next) => {
  if (req.user.role !== 1)
    return res.status(403).json({ message: "Acceso solo para admins" });
  next();
};

module.exports = authMiddleware;

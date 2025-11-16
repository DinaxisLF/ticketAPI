const TransactionController = require("../controllers/transactionController");
const Auth = require("../middlewares/authMiddleware");

module.exports = (app) => {
  app.post(
    "/api/transaction/create",
    Auth.verifyToken,
    TransactionController.createTransaction
  );

  app.get(
    "/api/transaction/user/:usuario_id",
    Auth.verifyToken,
    TransactionController.transactionByUserId
  );

  app.get(
    "/api/transaction/:id",
    Auth.verifyToken,
    TransactionController.getCompleteTransaction
  );

  app.get(
    "/api/transaction/admin/all",
    Auth.verifyToken,
    Auth.requireAdmin,
    TransactionController.getAllTransactions
  );
};

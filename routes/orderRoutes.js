const express = require("express");
const router = express.Router();
const { requireAuth, requireAdmin } = require("../middlewares/authentication");

const {
createOrder,
getOrderById,
getMyOrders,
getAllOrders,
updateOrderToPaid,
updateOrderStatus,
} = require("../controllers/orderController")

router.post("/", requireAuth, createOrder);
router.get("/myorders", requireAuth, getMyOrders);
router.get("/:id", requireAuth, getOrderById);
router.put("/:id/pay", requireAuth, updateOrderToPaid);

//admin routes
router.get("/admin", requireAuth, requireAdmin, getAllOrders);
router.put("/admin/:id/status", requireAuth, requireAdmin, updateOrderStatus);


module.exports = router;
const express = require("express");
const router = express.Router();
const { requireAuth, requireAdmin } = require("../middlewares/authentication");
const upload = require("../middlewares/upload");

const {
  getAllProducts,
  getProductById,
  createProductReview,
  createProduct,
  updateProduct,
  deleteProduct,
  deleteProductReview,
  getAdminProducts,
} = require("../controllers/productController");

//public routes
router.get("/", getAllProducts);
router.get("/:id", getProductById);

router.post("/:id/reviews", requireAuth, createProductReview);
//Admin routes
router.get("/admin/all", requireAuth, requireAdmin, getAdminProducts);
router.post("/admin/create", requireAuth, requireAdmin, upload.single('image'), createProduct);
router.put("/admin/:id", requireAuth, requireAdmin, upload.single('image'), updateProduct);
router.delete("/admin/:id", requireAuth, requireAdmin, deleteProduct);
router.delete("/admin/:productId/reviews/:reviewId", requireAuth, requireAdmin, deleteProductReview);


module.exports = router;
const express = require("express");
const router = express.Router();
const { requireAuth, requireAdmin } = require("../middlewares/authentication");
const {getAllUsers, getUserById, adminDeleteUser, updateUserRole} = require("../controllers/adminUserController");

router.use(requireAuth, requireAdmin);

router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.put("/:id/role", updateUserRole);
router.delete("/:id", adminDeleteUser);

module.exports = router;
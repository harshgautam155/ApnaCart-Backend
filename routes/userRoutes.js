const express = require("express");
const router = express.Router();
const {
  registerUser,
  verifyUser,
  resendOtp,
  loginUser,
  logoutUser,
  deleteUser,
  getUserProfile,
  updateUserProfile,
} = require("../controllers/authController");
const { requireAuth } = require("../middlewares/authentication");

router.post("/register", registerUser);
router.post("/verify", verifyUser);
router.post("/resend-otp", resendOtp);
router.post("/login", loginUser);

router.post("/logout", requireAuth, logoutUser);
router.delete("/delete", requireAuth, deleteUser);
router.get("/profile", requireAuth, getUserProfile);
router.put("/profile", requireAuth, updateUserProfile);

module.exports = router;    
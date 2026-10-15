const User = require("../models/userModel");
const mongoose = require("mongoose");

async function getAllUsers(req, res) {
  try {
    const {
      page = 1,
      limit = 10,
      sort = "-createdAt",
      role,
      search,
    } = req.query;
    const filter = {};
    if (role) {
      filter.role = role;
    }

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit)); // Limit to a maximum of 100 users per page
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .select("-password -otp -otpExpiry")
        .lean(),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      message: "Users retrieved successfully",
      success: true,
      data: users,
      count: users.length,
      total,
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    res.status(500).json({
      message: "Failed to get all users",
      error: error.message,
    });
  }
}

async function getUserById(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }
    const user = await User.findById(id)
      .select("-password -otp -otpExpiry")
      .lean();
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }
    res.status(200).json({
      message: "User retrieved successfully",
      data: user,
    });
  } catch (error) {
    console.error("Error in getUserById:", error);
    res.status(500).json({
      message: "Failed to get user by ID",
      error: error.message,
    });
  }
}

async function updateUserRole(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }
    if (!role || !["user", "admin"].includes(role)) {
      return res.status(400).json({
        message: "Invalid role. Role must be either 'user' or 'admin'.",
      });
    }

    if (id === req.user._id.toString() && role === "user") {
      return res.status(400).json({
        success: false,
        message: "You cannot downgrade your own role to 'user'.",
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true },
    )
      .select("-password -otp -otpExpiry")
      .lean();
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }
    res.status(200).json({
      message: "User role updated successfully",
      data: user,
    });
  } catch (error) {
    console.error("Error in updateUserRole:", error);
    res.status(500).json({
      message: "Failed to update user role",
      error: error.message,
    });
  }
}

async function adminDeleteUser(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    if (id === req.user._id.toString()) {
      return res.status(400).json({
        message: "You cannot delete your own account",
      });
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteUser:", error);
    res.status(500).json({
      message: "Failed to delete user",
      error: error.message,
    });
  }
}

module.exports = {
  getAllUsers,
  getUserById,
  updateUserRole,
  adminDeleteUser,
};

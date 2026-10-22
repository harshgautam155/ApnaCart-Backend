const bcrypt = require("bcrypt");
const User = require("../models/userModel");
const mongoose = require("mongoose");
const { generateOTP } = require("../services/otpService");
const { createToken } = require("../services/authentication");
const { sendEmail } = require("../utils/sendEmail");
const { authCookieOptions } = require("../utils/authCookie");

async function registerUser(req, res) {
  const { fullName, email, phoneNumber, password } = req.body;
  try {
    if (!fullName || !email || !phoneNumber || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    let user = await User.findOne({ email });
    if (user && user.isVerified) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const otpCode = generateOTP();
    const expiryTime = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 minutes

    if (user && !user.isVerified) {
      user.otp = otpCode;
      user.otpExpiry = expiryTime;
      await user.save();
    } else {
      user = await User.create({
        fullName,
        email,
        phoneNumber,
        password,
        otp: otpCode,
        otpExpiry: expiryTime,
        isVerified: false,
      });
    }

    await sendEmail({
      to: email,
      subject: "Verify your email",
      html: `
      <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
      <h2>Verify your apnaCart account</h2>
      <p>Your OTP code is:</p>
      <h1 style="letter-spacing: 4px; color: #f97316;">${otpCode}</h1>
      <p>This code will expire in 5 minutes.</p>
      <p>If you didn't request this, you can ignore this email.</p>
    </div>
  `,
    });

    res.status(200).json({
      message: "Otp sent successfully",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Failed to register user",
      error: error.message,
    });
  }
}

async function verifyUser(req, res) {
  const { email, otp } = req.body;
  try {
    if (!email || !otp) {
      return res.status(400).json({
        message: "Email and OTP are required",
      });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.otp !== otp) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    if (user.otpExpiry < new Date()) {
      return res.status(400).json({
        message: "OTP has expired",
      });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.status(200).json({
      message: "User verified successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Verification failed",
      error: error.message,
    });
  }
}

async function resendOtp(req, res) {
  const { email } = req.body;
  try {
    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        message: "User is already verified",
      });
    }

    const otpCode = generateOTP();
    const expiryTime = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 minutes

    user.otp = otpCode;
    user.otpExpiry = expiryTime;
    await user.save();

    await sendEmail({
      to: email,
      subject: "Resend OTP for your apnaCart account",
      html: `      <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
      <h2>Verify your apnaCart account</h2>
      <p>Your OTP code is:</p>
      <h1 style="letter-spacing: 4px; color: #f97316;">${otpCode}</h1>
      <p>This code will expire in 5 minutes.</p>
      <p>If you didn't request this, you can ignore this email.</p>
    </div>`,
    });

    res.status(200).json({
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.log(error)
    res.status(500).json({
      message: "Failed to resend OTP",
      error: error.message,
    });
  }
}

async function loginUser(req, res) {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (!user.isVerified) {
      return res.status(400).json({
        message: "User is not verified. Please verify your account.",
        needVerification: true,
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid password",
      });
    }
    const token = createToken(user);

    res.cookie("authtoken", token, authCookieOptions);

    res.status(200).json({
      message: "User logged in successfully",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("Error in loginUser:", error);
    res.status(500).json({
      message: "Failed to login user",
      error: error.message,
    });
  }
}

async function logoutUser(req, res) {
  try {
    res.clearCookie("authtoken", authCookieOptions);

    return res.status(200).json({
      message: "User logged out successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to logout user",
      error: error.message,
    });
  }
}

async function deleteUser(req, res) {
  try {
    const userId = req.user._id;
    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.clearCookie("authtoken", authCookieOptions);

    res.status(200).json({
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete user",
      error: error.message,
    });
  }
}

async function getUserProfile(req, res) {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Unauthorized: User ID missing" });
    }

    const userId = req.user._id;
    const user = await User.findById(userId)
      .select("-password -otp -otpExpiry")
      .lean();
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }
    res.status(200).json({
      message: "User profile retrieved successfully",
      user,
    });
  } catch (error) {
    console.error("Error in getUserProfile:", error);
    res.status(500).json({
      message: "Failed to get user profile",
      error: error.message,
    });
  }
}

async function updateUserProfile(req, res) {
  try {
    const userId = req.user._id;

    const { fullName, phoneNumber } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { fullName, phoneNumber },
      { new: true, runValidators: true },
    )
      .select("-password -otp -otpExpiry")
      .lean();

    return res.status(200).json({
      message: "User profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error in updateUserProfile:", error);
    res.status(500).json({
      message: "Failed to update user profile",
      error: error.message,
    });
  }
}

// ADMIN

module.exports = {
  registerUser,
  verifyUser,
  resendOtp,
  loginUser,
  logoutUser,
  deleteUser,
  getUserProfile,
  updateUserProfile,
};

require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/mongooseConnection");
const path = require("path");
const cors = require("cors");
const {checkForAuthenticationCookie} = require("./middlewares/authentication");

const userRoutes = require("./routes/userRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(checkForAuthenticationCookie("authtoken"));

app.use("/api/user", userRoutes);
app.use("/api/admin/user", adminUserRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
connectDB();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

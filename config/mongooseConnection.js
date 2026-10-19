require("dotenv").config;
const mongoose = require("mongoose");
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`database succesfully connected at: ${process.env.PORT}`);
  } catch (error) {
    console.log("MongoDB Connection Error", error.message);
  }
};
   if (process.env.NODE_ENV !== "production") {
     const dns = require("dns");
     dns.setServers(["8.8.8.8", "1.1.1.1"]);
   }
module.exports = connectDB;

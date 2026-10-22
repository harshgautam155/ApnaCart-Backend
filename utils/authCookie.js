const isProduction = process.env.NODE_ENV === "production";

const authCookieOptions = {
  httpOnly: true,
  sameSite: isProduction ? "none" : "lax",
  secure: isProduction,
  path: "/",
};

module.exports = {
  authCookieOptions,
};

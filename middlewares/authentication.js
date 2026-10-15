const { validateToken } = require("../services/authentication");

function checkForAuthenticationCookie(cookieName, requireAuth = false) {
  return (req, res, next) => {
    req.user = null;
    const tokenCookieValue = req.cookies?.[cookieName];

    if (!tokenCookieValue) {
      if (requireAuth) {
        return res.status(401).json({
          error: "Authentication required",
          message: "Please log in to access this resource",
        });
      }
      return next();
    }

    try {
      const userPayload = validateToken(tokenCookieValue);

      req.user = userPayload;
      return next();
    } catch (error) {
      const isExpired = error.name === "TokenExpiredError";

      console.warn(`Token validation failed: ${error.message}`);

      if (requireAuth) {
        return res.status(401).json({
          error: isExpired ? "Token has expired" : "Invalid token",
          message: "Please log in",
        });
      }

      res.clearCookie(cookieName);
      return next();
    }
  };
}

const requireAuth = checkForAuthenticationCookie("authtoken", true);

function requireAdmin(req, res, next) {
  if(!req.user){
    return res.status(401).json({
      error: "Authentication required",
      message: "Please log in to access this resource",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      error: "Forbidden",
      message: "You do not have permission to access this resource",
    });
  }
  next();
}
module.exports = {
  checkForAuthenticationCookie,
  requireAuth,
  requireAdmin,
};
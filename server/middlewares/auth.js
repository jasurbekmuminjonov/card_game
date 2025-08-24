const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

const auth = async (req, res, next) => {
  const publicPaths = ["/register", "/login", "/username/check"];

  if (publicPaths.includes(req.path)) {
    return next();
  }
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ status: "unauthorized" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    const user = await User.findById(decoded.user_id);
    if (!user) return res.status(401).json({ status: "unauthorized" });
    next();
  } catch (err) {
    res.status(401).json({ status: "unauthorized" });
  }
};
module.exports = auth;

const auth = (req, res, next) => {
  const publicPaths = ["/register", "/username/check"];

  if (publicPaths.includes(req.path)) {
    return next();
  }
  if (!req.headers.user_id) {
    return res.status(401).json({ status: "unauthorized" });
  }
  next();
};
module.exports = auth;

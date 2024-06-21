// /src/middleware/auth.js
require("dotenv").config();

const authenticate = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  if (apiKey && apiKey === process.env.API_KEY) {
    next();
  } else {
    res.status(403).json({ message: "Forbidden: Incorrect API Key" });
  }
};

module.exports = authenticate;

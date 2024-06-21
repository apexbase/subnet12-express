require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const bodyParser = require("body-parser");

const vmRoutes = require("./src/routes/vmRoutes");
const scheduledJob = require("./src/jobs/scheduledJob");

const app = express();
const logger = require("./src/config/logger");

mongoose
  .connect(process.env.MONGO_URI, {
    autoIndex: true,
  })
  .then(() => logger.info("MongoDB connected"))
  .catch((err) => logger.error(err));

app.use(morgan("dev"));
app.use(bodyParser.json());

app.use("/api/vm", vmRoutes);

// Start the scheduled job
scheduledJob.start();

const port = process.env.PORT || 3000;
app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});

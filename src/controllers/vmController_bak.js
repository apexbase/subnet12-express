// /src/controllers/vmController.js
const { Worker } = require("worker_threads");
const path = require("path");
const logger = require("../config/logger");
const VM = require("../models/VM");

exports.createVM = (req, res) => {
  const { name, token } = req.body;

  const worker = new Worker(
    path.resolve(__dirname, "../workers/createVMWorker.js"),
    {
      workerData: { name, token },
    }
  );

  worker.on("message", (message) => {
    if (message.success) {
      try {
        const newVM = new VM({
          id: message.id,
          ip: message.ip, // Adjust based on the actual response structure
          status: "ACTIVE",
          gpu_type: message.gpu_type,
          token: message.token,
        });
        newVM.save();
      } catch (error) {
        console.error(`An error occurred: ${error.message}`);
      }
      res.status(201).json({ ip: message.ip });
    } else {
      res.status(500).json({ message: message.message });
    }
  });

  worker.on("error", (error) => {
    logger.error(`Worker error: ${error.message}`);
    res.status(500).json({ message: error.message });
  });

  worker.on("exit", (code) => {
    if (code !== 0) {
      logger.error(`Worker stopped with exit code ${code}`);
      res
        .status(500)
        .json({ message: `Worker stopped with exit code ${code}` });
    }
  });
};

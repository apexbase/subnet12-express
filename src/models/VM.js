const mongoose = require("mongoose");

const VMSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    ip: { type: String, required: true },
    status: { type: String, required: true },
    gpu_type: { type: String, required: true },
    token: { type: String, required: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model("VM", VMSchema);

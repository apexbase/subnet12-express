// /src/workers/createVMWorker.js
const { parentPort, workerData } = require("worker_threads");
const {
  CudoAPIManager,
  getVmDataTemplate,
} = require("../utils/cudoAPIManager");
const VM = require("../models/VM");
const logger = require("../config/logger");

async function createVM(name, token) {
  const cudo = new CudoAPIManager();

  let id = token.substring(0, 8);
  id = "p" + id;
  logger.info(id);

  try {
    const { gpuModel, machineType } = await cudo.getBestGpuModel();
    logger.info(
      `Using GPU model: ${gpuModel} with machine type: ${machineType}`
    );

    const vmData = getVmDataTemplate(gpuModel, machineType, id);
    const vmResponse = await cudo.createVM(vmData);

    if (await cudo.waitForVM(vmResponse.id)) {
      const data = await cudo.getVMStatus(vmResponse.id);
      console.log(data.VM.externalIpAddress);

      //   try {
      //     const newVM = new VM({
      //       id: vmResponse.id,
      //       ip: data.VM.externalIpAddress, // Adjust based on the actual response structure
      //       status: "ACTIVE",
      //       gpu_type: gpuModel,
      //       token: token,
      //     });
      //     await newVM.save();
      //   } catch (error) {
      //     console.error(`An error occurred: ${error.message}`);
      //   }
      parentPort.postMessage({
        success: true,
        ip: data.VM.externalIpAddress,
        id: vmResponse.id,
        gpu_type: gpuModel,
        token: token,
      });
    } else {
      await cudo.deleteVM(vmResponse.id);
      parentPort.postMessage({
        success: false,
        message: "VM did not become ready in time",
      });
    }
  } catch (error) {
    logger.error(`An error occurred: ${error.message}`);
    parentPort.postMessage({ success: false, message: error.message });
  }
}

createVM(workerData.name, workerData.token);

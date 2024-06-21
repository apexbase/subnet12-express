const axios = require("axios");
const VM = require("../models/VM");
const crypto = require("crypto");

const {
  CudoAPIManager,
  getVmDataTemplate,
} = require("../utils/cudoAPIManager");
const logger = require("../config/logger");

exports.createVM = async (req, res) => {
  const { count } = req.body;

  const generateRandomId = () => {
    return "p" + crypto.randomBytes(4).toString("hex");
  };

  // let id = token.substring(0, 8);
  // id = "p" + id;
  // logger.info(id);

  const cudo = new CudoAPIManager();
  const waitTasks = [];

  try {
    for (let i = 0; i < count; i++) {
      // const { gpuModel, machineType } = await cudo.getBestGpuModel();
      const gpuModel = "NVIDIA A40";
      const machineType = "ice-lake-a40";
      logger.info(
        `Using GPU model: ${gpuModel} with machine type: ${machineType}`
      );

      const id = generateRandomId();
      const vmData = getVmDataTemplate(gpuModel, machineType, id);
      const vm = await cudo.createVM(vmData);

      if (vm == null) {
        continue;
      }

      const waitTask = (async (vm, gpuModel) => {
        if (await cudo.waitForVM(vm.id)) {
          const data = await cudo.getVMStatus(vm.id);
          console.log(data.VM.externalIpAddress);
          const newVM = new VM({
            id: vm.id,
            ip: data.VM.externalIpAddress, // Adjust based on the actual response structure
            status: data.VM.state,
            gpu_type: gpuModel,
            token: "",
          });
          await newVM.save();
          return { success: true, ip: data.VM.externalIpAddress };
        } else {
          await cudo.deleteVM(vm.id);
          return {
            success: false,
            message: `VM ${vm.id} did not become ready in time`,
          };
        }
      })(vm, gpuModel);

      waitTasks.push(waitTask);
    }

    const results = await Promise.all(waitTasks);
    res.status(201).json(results);
  } catch (error) {
    logger.error(`An error occurred: createVM ${error.message}`);
    res.status(500).json({ message: error.message });
  }

  //   const cudo = new CudoAPIManager();

  //   try {
  //     const vmCreationTasks = Array.from({ length: count }, async () => {
  //       const { gpuModel, machineType } = await cudo.getBestGpuModel();
  //       logger.info(
  //         `Using GPU model: ${gpuModel} with machine type: ${machineType}`
  //       );

  //       const id = generateRandomId();
  //       const vmData = getVmDataTemplate(gpuModel, machineType, id);
  //       const vm = await cudo.createVM(vmData);

  //       if (await cudo.waitForVM(vm.id)) {
  //         const data = await cudo.getVMStatus(vm.id);
  //         console.log(data.VM.externalIpAddress);
  //         const newVM = new VM({
  //           id: vm.id,
  //           ip: data.VM.externalIpAddress, // Adjust based on the actual response structure
  //           status: "ACTIVE",
  //           gpu_type: gpuModel,
  //           token: token,
  //         });
  //         await newVM.save();
  //         return { success: true, ip: data.VM.externalIpAddress };
  //         // res.status(201).json({ ip: data.VM.externalIpAddress });
  //       } else {
  //         await cudo.deleteVM(vm.id);
  //         return {
  //           success: false,
  //           message: `VM ${id} did not become ready in time`,
  //         };
  //         // res.status(500).json({ message: "VM did not become ready in time" });
  //       }

  //     });
  //     const results = await Promise.all(vmCreationTasks);
  //     res.status(201).json(results);
  //   } catch (error) {
  //     console.error(`An error occurred: ${error.message}`);
  //     res.status(500).json({ message: error.message });
  //   }
  // };

  // exports.deleteVM = async (req, res) => {
  //   const { vm_id } = req.body;
  //   const cudo = new CudoAPIManager();

  //   try {
  //     const result = await cudo.deleteVM(vm_id);
  //     await VM.findOneAndDelete({ vmId: vm_id });
  //     res.status(200).json(result);
  //   } catch (error) {
  //     logger.error(`An error occurred: ${error.message}`);
  //     res.status(500).json({ message: error.message });
  //   }
};

exports.updateVM = async (req, res) => {
  try {
    const { ip, token } = req.body;

    const result = await VM.findOneAndUpdate(
      { ip: ip }, // Search criteria
      { token: token }, // Update operation
      { new: true } // Return the updated document
    );

    if (result) {
      res.status(201).json(result);
    } else {
      res.status(500).json({ message: "error updateVM" });
    }
  } catch (error) {
    logger.error(`An error occurred: updateVM: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

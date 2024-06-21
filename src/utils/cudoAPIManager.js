// /src/utils/cudoAPIManager.js
const axios = require("axios");
const logger = require("../config/logger");

class CudoAPIManager {
  constructor() {
    this.api_key = process.env.CUDO_API_KEY;
    this.project_id = process.env.CUDO_PROJECT_ID;
    this.base_url = "https://rest.compute.cudo.org/v1";
  }

  getHeaders() {
    return {
      Authorization: `Bearer ${this.api_key}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };
  }

  async createVM(data) {
    const url = `${this.base_url}/projects/${this.project_id}/vm`;
    try {
      const response = await axios.post(url, data, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      logger.error(
        `Failed to create VM: ${
          error.response ? error.response.data : error.message
        }`
      );
      return null;
      // throw error;
    }
  }

  async deleteVM(vm_id) {
    const url = `${this.base_url}/projects/${this.project_id}/vms/${vm_id}/terminate`;
    try {
      logger.info(`Deleting: ${vm_id}`);
      const response = await axios.post(
        url,
        {},
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      logger.error(
        `Failed to delete VM: ${
          error.response ? error.response.data : error.message
        }`
      );
      // throw error;
    }
  }

  async getVMStatus(vm_id) {
    const url = `${this.base_url}/projects/${this.project_id}/vms/${vm_id}`;
    try {
      const response = await axios.get(url, { headers: this.getHeaders() });
      logger.debug(`VM status response: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error) {
      logger.error(
        `Failed to get VM status: ${
          error.response ? error.response.data : error.message
        }`
      );
      // throw error;
    }
  }

  async waitForVM(vm_id, timeout = 300) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout * 1000) {
      const status = await this.getVMStatus(vm_id);
      if (status.VM.state === "ACTIVE") {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Poll every 5 seconds
    }
    return false;
  }

  async listMachineTypes() {
    const url = `${this.base_url}/vms/machine-types-2`;
    try {
      const response = await axios.get(url, { headers: this.getHeaders() });
      return response.data;
    } catch (error) {
      logger.error(
        `Failed to list machine types: ${
          error.response ? error.response.data : error.message
        }`
      );
      throw error;
    }
  }

  async getBestGpuModel() {
    const machineTypes = await this.listMachineTypes();
    let a6000Available = false;
    let a40Available = false;
    let machineType = "";
    let gpuModel = "";

    for (const machine of machineTypes.machineTypes) {
      if (machine.gpuModel === "RTX A6000" && machine.totalGpuFree > 0) {
        a6000Available = true;
        machineType = machine.machineType;
        gpuModel = machine.gpuModel;
        break;
      } else if (
        machine.gpuModel === "NVIDIA A40" &&
        machine.totalGpuFree > 0
      ) {
        a40Available = true;
        machineType = machine.machineType;
        gpuModel = machine.gpuModel;
      }
    }

    if (!a6000Available && !a40Available) {
      throw new Error("No suitable GPU machines available");
    }

    return { gpuModel, machineType };
  }
}

function getVmDataTemplate(gpuModel, machineType, id) {
  return {
    bootDisk: {
      id: id,
      sizeGib: 100,
      storageClass: "STORAGE_CLASS_NETWORK",
    },
    bootDiskImageId: "ubuntu-2204-nvidia-535-docker-v20240214",
    dataCenterId: "se-stockholm-1",
    machineType: machineType,
    gpuModel: gpuModel,
    gpus: 1,
    memoryGib: 16,
    vcpus: 4,
    vmId: id,
    customSshKeys: [
      "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCyMBVrrEd8iGp9WezKiCtFAaQet1vgS7UEEy8/cPFGLNtrYKazLieelC0Eo34Ta5+WT6/rhbjiooeJGvK3gXmw8KnjJtZm/qL+A4APIe3BTmpzKrcMebmqgbjgkdPkrG5UZaB2VHzroN4dkdFGUtyoaP2B1tfoSVWVE24YYfI8+E79saej1Kv95ihefN+pp51eShlafu9Gpn0E4+apuL83TEzSelfG1eU1cLdNh642h9I4TTczyoJiYysey1smHE/+YGCnl15ZVrgbcADVnNmtNSg6PfOeWxM7AgcUb8qfYdggeqSPzUKH+GsGb/EqhxOs87mUUdAaY0eAlni2i0UD4PJwIt4jeWU+2uHA04MAtv4KU+WicNZnBb2u9Z12odJ1SWR/GvH5PSCq19JIrrKlL+iaDLNDUd7Ti6kox8sqO2VBubKOGSNryElVaPUlBZoNnYyeVCM5qOvwmhklkKqcBknC3PstXAM2pHiPNrcLtiSZROq+fHiPaiEtiwARJXE=",
    ],
  };
}

module.exports = {
  CudoAPIManager,
  getVmDataTemplate,
};

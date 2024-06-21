// /src/jobs/scheduledJob.js
const cron = require("node-cron");
const axios = require("axios");
const csvParser = require("csv-parser");
const logger = require("../config/logger"); // Assuming you have logger set up
const { CudoAPIManager } = require("../utils/cudoAPIManager");
const VM = require("../models/VM");
const { Readable } = require("stream");

const cudo = new CudoAPIManager();

async function fetchCSVData() {
  try {
    const response = await axios.get(
      "http://102.217.2.6:8000/receipts/receipts.csv"
    ); // Replace with your actual CSV API URL
    return response.data;
  } catch (error) {
    logger.error(`Failed to fetch CSV data: ${error.message}`);
    throw error;
  }
}

function parseCSVData(csvData) {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = Readable.from(csvData);
    stream
      .pipe(csvParser())
      .on("data", (data) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", (error) => reject(error));
  });
}

const job = cron.schedule("* * * * *", async () => {
  logger.info("Running scheduled job to check VM statuses");
  try {
    // Fetch all VMs from the database
    const vms = await VM.find();

    if (vms.length === 0) {
      logger.info("No VMs found in the database. Skipping CSV fetch.");
      return;
    }

    const csvData = await fetchCSVData();
    const parsedData = await parseCSVData(csvData);

    const jobUUIDs = parsedData.map((row) => row.job_uuid.substring(0, 8));
    // console.log(jobUUIDs);

    // Iterate over each VM and check its status
    for (const vm of vms) {
      let status;
      try {
        status = await cudo.getVMStatus(vm.id);
        logger.info(`VM ID: ${vm.id}, Status: ${status.VM.state}`);
      } catch {
        // logger.error("failed to getVMStatus");
        continue;
      }

      const id = vm.token.substring(0, 8);

      if (jobUUIDs.includes(id)) {
        logger.info(`VM ID: ${id} exists in the job_uuid column of the CSV.`);

        // Delete the VM from the cloud provider
        await cudo.deleteVM(vm.id);

        // Delete the VM record from the database
        await VM.findOneAndDelete({ id: vm.id });
      } else {
        logger.info(
          `VM ID: ${id} does not exist in the job_uuid column of the CSV.`
        );
      }
    }
  } catch (error) {
    logger.error(
      `An error occurred during the scheduled job: ${error.message}`
    );
  }
});

module.exports = job;

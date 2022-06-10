/*! Copyright Sergei Akopov (thecloud21.com). All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

const AWS = require("aws-sdk");

const { deleteResourcesForTest } = require("./deleteTestResources.js");
const {
  initTestGetCompletedProcesses,
} = require("./initTestGetCompletedProcesses.js");

// Lambda handler
const { handler } = require("../../getCompletedProcesses");

// Mock event
const event = require("./testEventGetCompletedProcesses.json");

// Mock environment variables
process.env.AWS_REGION = "us-east-1";
AWS.config.region = process.env.AWS_REGION;
process.env.DDB_TABLE = "sensordata-table";
process.env.localTest = true;

const main = async () => {
  console.time("localTest");

  // Initialize test resources:
  console.log("Initializing test resources!");
  await initTestGetCompletedProcesses();

  // Testing lambda function:
  console.log("Testing lambda!");
  const readResult = await handler(event);
  console.assert(
    readResult.length === 2,
    `Test failed! Expected # of items: 2, actual: ${readResult.length}`
  );

  // Delete the test resources:
  console.log("Deleting test resources!");
  await deleteResourcesForTest();

  console.timeEnd("localTest");
};

main().catch((error) => console.error(error));

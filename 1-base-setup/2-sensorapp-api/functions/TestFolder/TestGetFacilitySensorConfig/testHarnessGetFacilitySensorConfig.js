/*! Copyright Sergei Akopov (thecloud21.com). All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

const AWS = require("aws-sdk");

// Mock event
const event = require("./testEventGetFacilitySensorConfig.json");

// Lambda handler
const { handler } = require("../../getFacilitySensorConfig");
const { deleteResourcesForTest } = require("./deleteTestResources.js");
const {
  initTestGetFacilitySensorConfig,
} = require("./initTestGetFacilitySensorConfig.js");

// Mock environment variables
process.env.AWS_REGION = "us-east-1";
AWS.config.region = process.env.AWS_REGION;
process.env.DDB_TABLE = "sensordata-table";
process.env.localTest = true;

const main = async () => {
  console.time("localTest");

  // Initialize test resources:
  console.log("Initializing test resources!");
  await initTestGetFacilitySensorConfig();

  // Testing lambda function:
  console.log("Testing lambda!");
  readResult = await handler(event);
  console.assert(
    readResult.length === 1,
    `Test failed! Expected # of items: 1, actual: ${readResult.length}`
  );

  // Delete the test resources:
  console.log("Deleting test resources!");
  await deleteResourcesForTest();

  console.timeEnd("localTest");
};

main().catch((error) => console.error(error));

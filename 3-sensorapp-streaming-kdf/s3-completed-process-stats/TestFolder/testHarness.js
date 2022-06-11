/*! Copyright Sergei Akopov (thecloud21.com). All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

// Mock event
const event = require("./testEvent.json");
const { initResourcesForTest } = require("./initTestResources.js");
const { deleteResourcesForTest } = require("./deleteTestResources.js");

const AWS = require("aws-sdk");

// Mock environment variables
process.env.AWS_REGION = "us-east-1";
process.env.DDB_TABLE = "sensordata-table";
AWS.config.region = process.env.AWS_REGION;
process.env.localTest = true;

// Lambda handler
const { handler } = require("../app");

const main = async () => {
  console.time("localTest");
  await initResourcesForTest();

  // Testing lambda function:
  console.log("Testing lambda!");
  console.dir(await handler(event));

  // Delete the test resources:
  console.log("Deleting test resources!");
  await deleteResourcesForTest();

  console.timeEnd("localTest");
};

main().catch((error) => console.error(error));

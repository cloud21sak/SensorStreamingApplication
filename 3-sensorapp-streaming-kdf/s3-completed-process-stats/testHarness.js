/*! Copyright Sergei Akopov (thecloud21.com). All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

// Mock event
const event = require("./testEvent.json");
const { deleteResourcesForTest } = require("./deleteTestResources.js");

const AWS = require("aws-sdk");
AWS.config.region = process.env.AWS_REGION;

// Mock environment variables
process.env.AWS_REGION = "us-east-1";
process.env.IOT_DATA_ENDPOINT =
  "a1dqbiklucuqp5-ats.iot.us-east-1.amazonaws.com";
process.env.TOPIC = "process-dailystats";
process.env.localTest = true;

// Test DynamoDb table info:
process.env.DDB_TABLE = "sensordata-table";

// Lambda handler
const { handler } = require("./app");

const main = async () => {
  console.time("localTest");
  
  // Testing lambda function:
  console.dir(await handler(event));
  
  // Delete the test resources:
  await deleteResourcesForTest();

  console.timeEnd("localTest");
};

main().catch((error) => console.error(error));

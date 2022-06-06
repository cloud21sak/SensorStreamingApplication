/*! Copyright Sergei Akopov (thecloud21.com). All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

// Mock event
const event = require("./testEventGetCompletedProcesses.json");

// Mock environment variables
process.env.AWS_REGION = "us-east-1";
process.env.DDB_TABLE = "sensordata-table";
process.env.localTest = true;

// Lambda handler
const { handler } = require("../getCompletedProcesses");

const main = async () => {
  console.time("localTest");

  // Testing lambda function:
  console.log("Testing lambda!");
  console.dir(await handler(event));
  
  console.timeEnd("localTest");
};

main().catch((error) => console.error(error));

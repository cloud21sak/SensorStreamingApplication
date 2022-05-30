/*! Copyright Sergei Akopov (thecloud21.com). All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

// Mock event
const event = require("./testEvent.json");
const { deleteResourcesForTest } = require("./deleteTestResources.js");

const AWS = require("aws-sdk");

// Mock environment variables
process.env.AWS_REGION = "us-east-1";
AWS.config.region = process.env.AWS_REGION;
const runtimeBucketName = "sensordata-runtimeprocess-bucket";
process.env.RuntimeProcessBucket = runtimeBucketName;
process.env.localTest = true;

// Lambda handler
const { handler } = require("../app");

const main = async () => {
  console.time("localTest");
  console.dir(await handler(event));
  console.timeEnd("localTest");
};

main().catch((error) => console.error(error));

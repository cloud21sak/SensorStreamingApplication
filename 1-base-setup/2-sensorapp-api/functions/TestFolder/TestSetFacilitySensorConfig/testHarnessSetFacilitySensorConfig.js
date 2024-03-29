/*! Copyright Sergei Akopov (thecloud21.com). All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

const AWS = require("aws-sdk");
const { deleteResourcesForTest } = require("./deleteTestResources.js");
const {
  initTestSetFacilitySensorConfig,
} = require("./initTestSetFacilitySensorConfig.js");
const { sleep } = require("../generateTestResources.js");

// Lambda handler
const { handler } = require("../../setFacilitySensorConfig");

// Mock event
const event = require("./testEventSetFacilitySensorConfig.json");

// Mock environment variables
process.env.AWS_REGION = "us-east-1";
AWS.config.region = process.env.AWS_REGION;
process.env.DDB_TABLE = "sensordata-table";
process.env.localTest = true;

const main = async () => {
  console.time("localTest");

  // Initialize test resources:
  console.log("Initializing test resources!");
  await initTestSetFacilitySensorConfig();

  // Testing lambda function:
  console.log("Testing lambda!");
  console.dir(await handler(event));

  // Use delay so that the test doesn't fail because of the eventualy
  // consistent read when quering DynamoDB table after write,
  // and running without debugging.
  await sleep(4000);

  // Verify that facility sensor configuration record exists in DynamoDB table:
  const documentClient = new AWS.DynamoDB.DocumentClient();
  const facilityId = parseInt(event.queryStringParameters.facilityId);

  const params = {
    TableName: process.env.DDB_TABLE,
    IndexName: "GSI_Index",
    KeyConditionExpression: "GSI = :gsi and begins_with(SK, :sk)",
    ExpressionAttributeValues: { ":gsi": facilityId, ":sk": "facilityconfig" },
    ScanIndexForward: true,
    Limit: 10,
  };

  const readResult = await documentClient.query(params).promise();
  console.log("readResult: ", readResult);

  console.assert(
    readResult.Items.length === 1,
    `Test failed! Expected # of items: 1, actual: ${readResult.Items.length}`
  );

  // Delete the test resources:
  console.log("Deleting test resources!");
  await deleteResourcesForTest();

  console.timeEnd("localTest");
};

main().catch((error) => console.error(error));

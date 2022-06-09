/*! Copyright Sergei Akopov (thecloud21.com). All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

const AWS = require("aws-sdk");

// Mock environment variables
process.env.AWS_REGION = "us-east-1";
AWS.config.region = process.env.AWS_REGION;
process.env.DDB_TABLE = "sensordata-table";
process.env.localTest = true;

const testDataFile = require("./testData.json");
const { createTestDynamoDBtable } = require("../generateTestResources.js");

let documentClient = undefined;

async function initTestGetFacilitySensorConfig() {
  console.log(
    "Initializing test resources for testing getFacilitySensorConfig()"
  );

  await createTestDynamoDBtable();

  documentClient = new AWS.DynamoDB.DocumentClient();
  // Set test sensor configuration for facility:
  const facilityId = testDataFile.facilityId;
  const sensorConfigObj = testDataFile.sensortypes;

  const response = await documentClient
    .put({
      TableName: process.env.DDB_TABLE,
      Item: {
        PK: `facility-${facilityId}`,
        SK: `facilityconfig`,
        GSI: facilityId,
        FacilityConfig: JSON.stringify(sensorConfigObj),
      },
    })
    .promise();

  console.log("Done setting test sensor configuration for facility!");
}

module.exports = { initTestGetFacilitySensorConfig };

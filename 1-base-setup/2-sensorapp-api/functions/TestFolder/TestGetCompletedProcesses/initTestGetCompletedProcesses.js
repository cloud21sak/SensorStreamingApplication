/*! Copyright Sergei Akopov (thecloud21.com). All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

const AWS = require("aws-sdk");

// Mock environment variables
process.env.AWS_REGION = "us-east-1";
AWS.config.region = process.env.AWS_REGION;
process.env.DDB_TABLE = "sensordata-table";
process.env.localTest = true;

const testResourcesData = require("../testResources.json");
const {
  createTestDynamoDBtable,
  sleep,
} = require("../generateTestResources.js");

let documentClient = undefined;

async function initTestGetCompletedProcesses() {
  console.log(
    "Initializing test resources for testing getCompletedProcesses()"
  );

  await createTestDynamoDBtable();

  documentClient = new AWS.DynamoDB.DocumentClient();
  // Initialize test data for completed process stats:
  for (
    let i = 0;
    i < testResourcesData.completedProcessTestDataList.length;
    i++
  ) {
    await generateCompletedProcessData(
      testResourcesData.completedProcessTestDataList[i]
    );
  }

  console.log("Test resources have been created!");
}

const generateCompletedProcessData = async (testData) => {
  let completedProcessData = {};
  completedProcessData.processSensorStats = {};
  completedProcessData.facilityId =
    testData.completedProcessTestData.facilityId;
  completedProcessData.processId = testData.completedProcessTestData.processId;

  testData.completedProcessTestData.processSensorStats.forEach(
    (procSensorStats) => {
      let sensorId = procSensorStats.sensorId;

      if (!(sensorId in completedProcessData.processSensorStats)) {
        completedProcessData.processSensorStats[`${sensorId}`] = {};
      }

      completedProcessData.processSensorStats[`${sensorId}`].min_val =
        procSensorStats.sensorStats.min_val;
      completedProcessData.processSensorStats[`${sensorId}`].max_val =
        procSensorStats.sensorStats.max_val;
      completedProcessData.processSensorStats[`${sensorId}`].median_val =
        procSensorStats.sensorStats.median_val;
      completedProcessData.processSensorStats[`${sensorId}`].name =
        procSensorStats.sensorStats.name;

      console.log(
        "completedProcessData.processSensorStats[sensorId]:",
        sensorId,
        completedProcessData.processSensorStats[sensorId]
      );
    }
  );

  await saveProcessSensorStats(completedProcessData);
};

const saveProcessSensorStats = async (completedProcessData) => {
  try {
    const sensorStatsData = JSON.stringify(
      completedProcessData.processSensorStats
    );
    const response = await documentClient
      .put({
        TableName: process.env.DDB_TABLE,
        Item: {
          PK: `proc-${completedProcessData.processId}`,
          SK: `completedstats`,
          GSI: completedProcessData.facilityId,
          stats: sensorStatsData,
          ts: Date.now(),
        },
      })
      .promise();

    // Use delay so that the test doesn't fail because of the eventualy
    // consistent read when quering DynamoDB table after write,
    // and running without debugging.
    await sleep(2000);
  } catch (err) {
    console.log("documentClient.put() error: ", err);
  }

  console.log("saveProcessSensorStats done");
};

module.exports = { initTestGetCompletedProcesses };

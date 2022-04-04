/*! Copyright Sergei Akopov (thecloud21.com). All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

//const { gzip, gunzip } = require("./lib/gzip");

const AWS = require("aws-sdk");
AWS.config.region = process.env.AWS_REGION;
const s3 = new AWS.S3();
const documentClient = new AWS.DynamoDB.DocumentClient();

let completedProcessData = {};
completedProcessData.processSensorDataObj = {};
completedProcessData.processSensorStats = {};

// Main Lambda handler
exports.handler = async (event) => {
  const object = event.Records[0];
  console.log("CompletedProcessStatsFunction is called");
  console.log("Bucket name:", object.s3.bucket.name);
  console.log("Bucket key:", object.s3.object.key);

  // Load completed process sensor data from History bucket:
  const response = await s3
    .getObject({
      Bucket: object.s3.bucket.name,
      Key: object.s3.object.key,
    })
    .promise();

  // Uncompress
  // SAK TEMP???
  // const data = await gunzip(response.Body);
  const data = response.Body;

  // 1. Convert to JSON array
  let jsonRecords = JSON.parse(data.toString());
  console.log("jsonRecords: ", jsonRecords);

  // 2. Get facility ID and process ID from the first record:
  completedProcessData.facilityId = jsonRecords[0].facilityId;
  completedProcessData.processId = jsonRecords[0].processId;
  console.log("ProcessID: ", completedProcessData.processId);

  // 3. Get completed process data for each sensor:
  await getProcessSensorData(jsonRecords);

  // 4. Calculate completed process stats for each sensor:
  getProcessSensorStats();

  // 5. Save completed process stats for each sensor to DDB table:
  console.log("Saving completed process stats for each sensor to DDB");

  await saveProcessSensorStats();
};

const getProcessSensorData = async (jsonRecords) => {
  jsonRecords.map((sensorDataRecord) => {
    console.log("sensorDataRecord:", sensorDataRecord);
    console.log(
      "completedProcessData.processSensorDataObj: ",
      completedProcessData.processSensorDataObj
    );
    if (
      !(sensorDataRecord.sensorId in completedProcessData.processSensorDataObj)
    ) {
      completedProcessData.processSensorDataObj[
        `${sensorDataRecord.sensorId}`
      ] = {};
      completedProcessData.processSensorDataObj[
        `${sensorDataRecord.sensorId}`
      ].sensorData = [];
      completedProcessData.processSensorDataObj[
        `${sensorDataRecord.sensorId}`
      ].name = sensorDataRecord.name;
    }

    completedProcessData.processSensorDataObj[
      `${sensorDataRecord.sensorId}`
    ].sensorData.push(sensorDataRecord.sensorData);
  });

  console.log("completedProcessData:", completedProcessData);
};

// TODO: refactor this into a separate lib module
const getProcessSensorStats = () => {
  for (const [sensorId, sensorDataInfo] of Object.entries(
    completedProcessData.processSensorDataObj
  )) {
    console.log(sensorId, sensorDataInfo);

    const min_val = Math.min(...sensorDataInfo.sensorData);
    console.log("min_val: ", min_val);
    const max_val = Math.max(...sensorDataInfo.sensorData);
    const median_val = median(sensorDataInfo.sensorData);
    if (!(sensorId in completedProcessData.processSensorStats)) {
      completedProcessData.processSensorStats[`${sensorId}`] = {};
    }

    completedProcessData.processSensorStats[`${sensorId}`].min_val = min_val;
    completedProcessData.processSensorStats[`${sensorId}`].max_val = max_val;
    completedProcessData.processSensorStats[`${sensorId}`].median_val =
      median_val;
    completedProcessData.processSensorStats[`${sensorId}`].name =
      sensorDataInfo.name;

    console.log(
      "completedProcessData.processSensorStats[sensorId]:",
      sensorId,
      completedProcessData.processSensorStats[sensorId]
    );
  }
};

// TODO: refactor this into a separate lib module
function median(numbers) {
  var median = 0,
    numsLen = numbers.length;
  numbers.sort((a, b) => a - b);

  if (
    numsLen % 2 ===
    0 // is even
  ) {
    // average of two middle numbers
    median = (numbers[numsLen / 2 - 1] + numbers[numsLen / 2]) / 2;
  } else {
    // is odd
    // middle number only
    median = numbers[(numsLen - 1) / 2];
  }

  return median;
}

const saveProcessSensorStats = async () => {
  console.log(
    "Saving completed process stats for each sensor to DDB:",
    completedProcessData.processId
  );

  const response = await documentClient
    .put({
      TableName: process.env.DDB_TABLE,
      Item: {
        PK: `proc-${completedProcessData.processId}`,
        SK: `completedstats`,
        GSI: completedProcessData.facilityId,
        stats: JSON.stringify(completedProcessData.processSensorStats),
        ts: Date.now(),
      },
    })
    .promise();

  console.log("saveProcessSensorStats done");
};

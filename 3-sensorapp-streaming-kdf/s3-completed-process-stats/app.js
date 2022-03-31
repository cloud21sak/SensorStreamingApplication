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
  //   let jsonRecords = convertToJsonArray(data.toString());
  //   console.log("jsonRecords: ", jsonRecords);

  // 2. Get facility ID and process ID from the first record:
  completedProcessData.facilityId = jsonRecords[0].facilityId;
  completedProcessData.processId = jsonRecords[0].processId;

  // 3. Get completed process data for each sensor:
  await getProcessSensorData(jsonRecords);

  // 4. Calculate completed process stats for each sensor:
  getProcessSensorStats();

  // 5. Save completed process stats for each sensor to DDB table:
  console.log("Saving completed process stats for each sensor to DDB");
  for (const [sensorId] of Object.entries(
    completedProcessData.processSensorDataObj
  )) {
    saveProcessSensorStats(sensorId);
  }
};

// Convert incoming data into a JSON array
// const convertToJsonArray = (raw) => {
//   let records = [];
//   // Split raw text into array using the newline character
//   const rawArray = raw.split(/\n/);
//   // Convert to JSON array, ignoring the final empty record
//   rawArray.map((item) => (item != "" ? records.push(JSON.parse(item)) : ""));
//   return records;
// };

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

const getProcessSensorStats = () => {
  for (const [sensorId, sensorDataInfo] of Object.entries(
    completedProcessData.processSensorDataObj
  )) {
    console.log(sensorId, sensorDataInfo);

    const min_val = Math.min(...sensorDataInfo.sensorData);
    console.log("min_val: ", min_val);
    const max_val = Math.max(...sensorDataInfo.sensorData);
    const median_val = median(sensorDataInfo.sensorData);
    sensorDataInfo.min_val = min_val;
    sensorDataInfo.max_val = max_val;
    sensorDataInfo.median_val = median_val;
    console.log(
      "completedProcessData.processSensorDataObj[sensorId]:",
      sensorId,
      completedProcessData.processSensorDataObj[sensorId]
    );
  }
};

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

const saveProcessSensorStats = async (sensorId) => {
  // TODO: refactor to use Promise.all() to perform saving to DDB in parallel
  console.log(
    "Saving completed process stats for each sensor to DDB:",
    sensorId,
    completedProcessData.processSensorDataObj[sensorId].min_val
  );
  const response = await documentClient
    .put({
      TableName: process.env.DDB_TABLE,
      Item: {
        PK: `${sensorId}`,
        SK: `completedstats`,
        GSI: completedProcessData.processId,
        min_val: completedProcessData.processSensorDataObj[sensorId].min_val,
        max_val: completedProcessData.processSensorDataObj[sensorId].max_val,
        median_val:
          completedProcessData.processSensorDataObj[sensorId].median_val,
        name: completedProcessData.processSensorDataObj[sensorId].name,
        ts: Date.now(),
      },
    })
    .promise();
  // }

  console.log("saveProcessSensorStats done");
};

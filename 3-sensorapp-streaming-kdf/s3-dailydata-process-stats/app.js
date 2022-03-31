/*! Copyright Sergei Akopov (thecloud21.com). All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

//const { gzip, gunzip } = require("./lib/gzip");

const AWS = require("aws-sdk");
AWS.config.region = process.env.AWS_REGION;
const s3 = new AWS.S3();
const documentClient = new AWS.DynamoDB.DocumentClient();

let facilityProcessDailyData = {};
facilityProcessDailyData.sensorDailyData = {};

// Main Lambda handler
exports.handler = async (event) => {
  console.log("DailyProcessStatsFunction is called");
  const object = event.Records[0];
  console.log("Bucket name:", object.s3.bucket.name);
  console.log("Bucket key:", object.s3.object.key);

  // Load incoming daily records written by Kinesis Data Firehose
  // from intermediate bucket:
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
  facilityProcessDailyData.facilityId = jsonRecords[0].facilityId;
  facilityProcessDailyData.processId = jsonRecords[0].processId;

  // 3. Get cumulative daily data for each sensor:
  await getDailySensorData(jsonRecords);

  // 4. Calculate current cumulative stats for each sensor of the process:
  getDailySensorStats();

  // 5. Save cumulative daily sensor stats of the running process into DDB table:
  console.log("Saving sensor daily stats to DDB");
  for (const [sensorId] of Object.entries(
    facilityProcessDailyData.sensorDailyData
  )) {
    saveDailySensorStats(sensorId);
  }
};

const getDailySensorData = async (jsonRecords) => {
  jsonRecords.map((sensorDataRecord) => {
    console.log("sensorDataRecord:", sensorDataRecord);
    console.log(
      "facilityProcessDailyData.sensorDailyData: ",
      facilityProcessDailyData.sensorDailyData
    );
    if (
      !(sensorDataRecord.sensorId in facilityProcessDailyData.sensorDailyData)
    ) {
      facilityProcessDailyData.sensorDailyData[`${sensorDataRecord.sensorId}`] =
        {};
      facilityProcessDailyData.sensorDailyData[
        `${sensorDataRecord.sensorId}`
      ].sensorData = [];
      facilityProcessDailyData.sensorDailyData[
        `${sensorDataRecord.sensorId}`
      ].name = sensorDataRecord.name;
    }

    facilityProcessDailyData.sensorDailyData[
      `${sensorDataRecord.sensorId}`
    ].sensorData.push(sensorDataRecord.sensorData);
  });

  console.log("facilityProcessDailyData:", facilityProcessDailyData);
};

const getDailySensorStats = () => {
  for (const [sensorId, sensorDataInfo] of Object.entries(
    facilityProcessDailyData.sensorDailyData
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
      "facilityProcessDailyData.sensorDailyData[sensorId]:",
      sensorId,
      facilityProcessDailyData.sensorDailyData[sensorId]
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

const saveDailySensorStats = async (sensorId) => {
  // TODO: refactor to use Promise.all() to perform saving to DDB in parallel
  console.log(
    "Saving in DDB:",
    sensorId,
    facilityProcessDailyData.sensorDailyData[sensorId].min_val
  );
  const response = await documentClient
    .put({
      TableName: process.env.DDB_TABLE,
      Item: {
        PK: `${sensorId}`,
        SK: `dailydata`,
        GSI: facilityProcessDailyData.facilityId,
        min_val: facilityProcessDailyData.sensorDailyData[sensorId].min_val,
        max_val: facilityProcessDailyData.sensorDailyData[sensorId].max_val,
        median_val:
          facilityProcessDailyData.sensorDailyData[sensorId].median_val,
        name: facilityProcessDailyData.sensorDailyData[sensorId].name,
        ts: Date.now(),
      },
    })
    .promise();
  // }

  console.log("saveDailyDataBySensorId done");
};

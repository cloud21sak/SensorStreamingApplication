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
facilityProcessDailyData.sensorDailyStats = {};

// Main Lambda handler
exports.handler = async (event) => {
  console.log(JSON.stringify(event, null, 2));

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
  await saveDailySensorStats();
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
      ].sensorData = {};
      facilityProcessDailyData.sensorDailyData[
        `${sensorDataRecord.sensorId}`
      ].name = sensorDataRecord.name;
    }

    // facilityProcessDailyData.sensorDailyData[
    //   `${sensorDataRecord.sensorId}`
    // ].sensorData.push(sensorDataRecord.sensorData);

    facilityProcessDailyData.sensorDailyData[
      `${sensorDataRecord.sensorId}`
    ].sensorData[`${sensorDataRecord.second}`] = sensorDataRecord.sensorData;
  });

  console.log("facilityProcessDailyData:", facilityProcessDailyData);
};

// TODO: refactor this into a separate lib module
const getDailySensorStats = () => {
  for (const [sensorId, sensorDataInfo] of Object.entries(
    facilityProcessDailyData.sensorDailyData
  )) {
    console.log("sensorId and sensorDataInfo:", sensorId, sensorDataInfo);
    let sensorData = [];
    for (let second in sensorDataInfo.sensorData) {
      sensorData.push(sensorDataInfo.sensorData[second]);
    }

    const min_val = Math.min(...sensorData);
    console.log("min_val: ", min_val);
    const max_val = Math.max(...sensorData);
    const median_val = median(sensorData);

    if (!(sensorId in facilityProcessDailyData.sensorDailyStats)) {
      facilityProcessDailyData.sensorDailyStats[`${sensorId}`] = {};
    }

    facilityProcessDailyData.sensorDailyStats[`${sensorId}`].min_val = min_val;
    facilityProcessDailyData.sensorDailyStats[`${sensorId}`].max_val = max_val;
    facilityProcessDailyData.sensorDailyStats[`${sensorId}`].median_val =
      median_val;
    facilityProcessDailyData.sensorDailyStats[`${sensorId}`].name =
      sensorDataInfo.name;
    console.log(
      "facilityProcessDailyData.sensorDailyStats[sensorId]:",
      sensorId,
      facilityProcessDailyData.sensorDailyStats[sensorId]
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

const saveDailySensorStats = async () => {
  console.log(
    "Saving running process stats in DDB:",
    facilityProcessDailyData.processId,
    facilityProcessDailyData.sensorDailyStats
  );

  // Stringify, compress, and store as an attribute value the daily stats
  // the running process:
  const response = await documentClient
    .put({
      TableName: process.env.DDB_TABLE,
      Item: {
        PK: `proc-${facilityProcessDailyData.processId}`,
        SK: `dailystats`,
        GSI: facilityProcessDailyData.facilityId,
        stats: JSON.stringify(facilityProcessDailyData.sensorDailyStats),
        ts: Date.now(),
      },
    })
    .promise();

  console.log("saveDailySensorStats done");
};

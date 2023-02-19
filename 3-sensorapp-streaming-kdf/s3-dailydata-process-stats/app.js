/*! Copyright Sergei Akopov (thecloud21.com). All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

//const { gzip, gunzip } = require("./lib/gzip");

const AWS = require("aws-sdk");
const { median, getStandardDevitation } = require("./lib/mathlib.js");

AWS.config.region = process.env.AWS_REGION;
const s3 = new AWS.S3();
const documentClient = new AWS.DynamoDB.DocumentClient();

let facilityProcessDailyData = undefined;

// Main Lambda handler
exports.handler = async (event) => {
  console.log(JSON.stringify(event, null, 2));

  facilityProcessDailyData = {};
  facilityProcessDailyData.sensorDailyData = {};
  facilityProcessDailyData.sensorDailyStats = {};

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
  // const data = await gunzip(response.Body);
  const data = response.Body;

  // 1. Convert to JSON array
  let jsonRecords = JSON.parse(data.toString());
  //console.log("jsonRecords: ", jsonRecords);

  // 2. Get facility ID and process ID from the first record:
  facilityProcessDailyData.facilityId = jsonRecords[0].facilityId;
  // TODO: refactor this for per process setup
  facilityProcessDailyData.processId = jsonRecords[0].processId;

  // 3. Get cumulative daily data for each sensor:
  await getDailySensorData(jsonRecords);

  // 4. Calculate current cumulative stats for each sensor of the process:
  await getDailySensorStats();

  // 5. Save cumulative daily sensor stats of the running process into DDB table:
  console.log("Saving sensor daily stats to DDB");
  await saveDailySensorStats();
};

const getDailySensorData = async (jsonRecords) => {
  jsonRecords.map((sensorDataRecord) => {
    // console.log("sensorDataRecord:", sensorDataRecord);
    // console.log(
    //   "facilityProcessDailyData.sensorDailyData: ",
    //   facilityProcessDailyData.sensorDailyData
    // );
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

    facilityProcessDailyData.sensorDailyData[
      `${sensorDataRecord.sensorId}`
    ].sensorData[`${sensorDataRecord.second}`] = sensorDataRecord.sensorData;

    return;
  });

  //  console.log("facilityProcessDailyData:", facilityProcessDailyData);
};

// TODO: refactor this into a separate lib module
const getDailySensorStats = async () => {
  for (const [sensorId, sensorDataInfo] of Object.entries(
    facilityProcessDailyData.sensorDailyData
  )) {
    //  console.log("sensorId and sensorDataInfo:", sensorId, sensorDataInfo);
    let sensorData = [];
    for (let second in sensorDataInfo.sensorData) {
      sensorData.push(sensorDataInfo.sensorData[second]);
    }

    const min_val = Math.min(...sensorData);
    const max_val = Math.max(...sensorData);
    const median_val = median(sensorData);
    const stddev_val = getStandardDevitation(sensorData);

    if (!(sensorId in facilityProcessDailyData.sensorDailyStats)) {
      facilityProcessDailyData.sensorDailyStats[`${sensorId}`] = {};
    }

    facilityProcessDailyData.sensorDailyStats[`${sensorId}`].min_val = min_val;
    facilityProcessDailyData.sensorDailyStats[`${sensorId}`].max_val = max_val;
    facilityProcessDailyData.sensorDailyStats[`${sensorId}`].median_val =
      median_val;
    facilityProcessDailyData.sensorDailyStats[`${sensorId}`].stddev_val =
      stddev_val;
    facilityProcessDailyData.sensorDailyStats[`${sensorId}`].name =
      sensorDataInfo.name;
    // console.log(
    //   "facilityProcessDailyData.sensorDailyStats[sensorId]:",
    //   sensorId,
    //   facilityProcessDailyData.sensorDailyStats[sensorId]
    // );
  }
};

const saveDailySensorStats = async () => {
  // console.log(
  //   "Saving running process stats in DDB:",
  //   facilityProcessDailyData.processId,
  //   facilityProcessDailyData.sensorDailyStats
  // );

  // Stringify, compress, and store the daily stats
  // of the running process as an attribute value:
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

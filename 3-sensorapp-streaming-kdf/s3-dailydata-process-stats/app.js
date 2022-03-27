/*! Copyright Sergei Akopov (thecloud21.com). All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

const { gzip, gunzip } = require("./lib/gzip");

const AWS = require("aws-sdk");
AWS.config.region = process.env.AWS_REGION;
const s3 = new AWS.S3();
const documentClient = new AWS.DynamoDB.DocumentClient();

let facilityProcessDailyData = {};
facilityProcessDailyData.sensorDailyData = {};

// Main Lambda handler
exports.handler = async (event) => {
  const object = event.Records[0];
  console.log("Bucket name:", object.s3.bucket.name);
  console.log("Bucket key:", object.s3.object.key);

  // Load incoming records written by Kinesis Data Firehose from S3:
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
  let jsonRecords = convertToJsonArray(data.toString());
  console.log("jsonRecords: ", jsonRecords);

  // 2. Get facility ID and process ID from the first record:
  facilityProcessDailyData.facilityId = jsonRecords[0].facilityId;
  facilityProcessDailyData.processId = jsonRecords[0].processId;

  // 3. Get cumulative daily data for each sensor:
  await getDailySensorData(jsonRecords);

  // 4. Calculate current cumulative stats for each sensor of the process:
  getDailySensorStats();
};

// Convert incoming data into a JSON array
const convertToJsonArray = (raw) => {
  let records = [];
  // Split raw text into array using the newline character
  const rawArray = raw.split(/\n/);
  // Convert to JSON array, ignoring the final empty record
  rawArray.map((item) => (item != "" ? records.push(JSON.parse(item)) : ""));
  return records;
};

const getDailySensorData = async (jsonRecords) => {
  jsonRecords.map((sensorDataRecord) => {
    if (!facilityProcessDailyData.sensorDailyData.sensorDataRecord.sensorId) {
      facilityProcessDailyData.sensorDailyData.sensorDataRecord.sensorId = {};
      facilityProcessDailyData.sensorDailyData.sensorDataRecord.sensorId.sensorData =
        [];
      facilityProcessDailyData.sensorDailyData.sensorDataRecord.sensorId.name =
        sensorDataRecord.name;
    }

    facilityProcessDailyData.sensorDailyData.sensorDataRecord.sensorId.sensorData.push(
      sensorDataRecord.sensorData
    );
  });

  console.log("facilityProcessDailyData:", facilityProcessDailyData);
};

const getDailySensorStats = () => {
  for (const [sensorId, sensorData] of Object.entries(
    facilityProcessDailyData.sensorDailyData
  )) {
    console.log(sensorId, sensorData);
  }
};

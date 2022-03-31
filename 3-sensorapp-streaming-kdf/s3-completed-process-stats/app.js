/*! Copyright Sergei Akopov (thecloud21.com). All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

//const { gzip, gunzip } = require("./lib/gzip");

const AWS = require("aws-sdk");
AWS.config.region = process.env.AWS_REGION;
const s3 = new AWS.S3();
const documentClient = new AWS.DynamoDB.DocumentClient();

let completedProcessData = {};
completedProcessData.sensorData = {};

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
  for (const [sensorId] of Object.entries(completedProcessData.sensorData)) {
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

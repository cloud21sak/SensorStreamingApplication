/*! Copyright Sergei Akopov (thecloud21.com). All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

const { gzip, gunzip } = require("./lib/gzip");

const AWS = require("aws-sdk");
AWS.config.region = process.env.AWS_REGION;
const s3 = new AWS.S3();
const documentClient = new AWS.DynamoDB.DocumentClient();

let sensorMap = {};
let facilityProcessData = {};

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

  // Convert to JSON array
  let jsonRecords = convertToJsonArray(data.toString());
  console.log("jsonRecords: ", jsonRecords);

  let runningProcessRecords = checkForRunningProcessRecords(jsonRecords);
  if (runningProcessRecords.length === 0) {
    console.log("No running processes");
    return;
  }
};

/*! Copyright Sergei Akopov (thecloud21.com). All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

const { gzip, gunzip } = require("./lib/gzip");

const AWS = require("aws-sdk");
AWS.config.region = process.env.AWS_REGION;
const s3 = new AWS.S3();
const documentClient = new AWS.DynamoDB.DocumentClient();

let sensorMap = {};

// Main Lambda handler
exports.handler = async (event) => {
  const object = event.Records[0];
  console.log("Bucket name:", object.s3.bucket.name);
  console.log("Bucket key:", object.s3.object.key);
  // Load incoming records from S3 (written by Kinesis Data Firehose)
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

  const recordsBySensorId = getRecordsBySensorId(jsonRecords);

  // Save the per-second data of each sensor in DDB
  await saveDailyDataBySensorId(recordsBySensorId);
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

const saveDailyDataBySensorId = async (recordsBySensorId) => {
  console.log("Saving to DDB:", recordsBySensorId);

  // Retrieve existing daily data for each sensor and add new results
  for (let sensorId in recordsBySensorId) {
    // console.log(
    //   "Current stream data for sensor:",
    //   sensorId,
    //   recordsBySensorId[sensorId]
    // );

    // Get existing daily data from DDB
    const data = await documentClient
      .get({
        TableName: process.env.DDB_TABLE,
        Key: {
          PK: `${sensorId}`,
          SK: `dailydata`,
        },
      })
      .promise();

    //console.log("Existing daily data for sensor from DDB: ", data);

    let results = data.Item ? JSON.parse(data.Item.results) : [];

    // Add latest data to existing daily data
    results.push.apply(results, recordsBySensorId[sensorId].results);

    // Save back to DDB table
    // TODO: refactor to use Promise.all() to perform saving to DDB in parallel
    const response = await documentClient
      .put({
        TableName: process.env.DDB_TABLE,
        Item: {
          PK: `${sensorId}`,
          SK: `dailydata`,
          GSI: recordsBySensorId[sensorId].facilityId,
          results: JSON.stringify(results),
          name: recordsBySensorId[sensorId].name,
          ts: Date.now(),
        },
      })
      .promise();
  }

  console.log("saveDailyDataBySensorId done");
};

// Convert event payload to JSON records
const getRecordsBySensorId = (jsonRecords) => {
  let sensorRecordMap = {};

  // Get records from event payload
  jsonRecords.map((record) => {
    if (!sensorRecordMap[record.sensorId]) {
      sensorRecordMap[record.sensorId] = {};
      sensorRecordMap[record.sensorId].results = [];
    }

    //console.log(      "Record sensordata for sensor:", record.name,record.sensorData    );
    sensorRecordMap[record.sensorId].sensorId = record.sensorId;
    sensorRecordMap[record.sensorId].facilityId = record.facilityId;
    sensorRecordMap[record.sensorId].name = record.name;

    sensorRecordMap[record.sensorId].results.push(record.sensorData);
  });
  return sensorRecordMap;
};

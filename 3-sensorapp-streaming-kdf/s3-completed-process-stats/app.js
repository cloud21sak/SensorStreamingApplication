/*! Copyright Sergei Akopov (thecloud21.com). All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

//const { gzip, gunzip } = require("./lib/gzip");

const AWS = require("aws-sdk");
const { median, getStandardDevitation } = require("./lib/mathlib.js");

AWS.config.region = process.env.AWS_REGION;
const s3 = new AWS.S3();
let documentClient = undefined;

let completedProcessData = undefined;
// completedProcessData.processSensorDataObj = {};
// completedProcessData.processSensorStats = {};

// Main Lambda handler
exports.handler = async (event) => {
  console.log(JSON.stringify(event, null, 2));

  completedProcessData = {};
  completedProcessData.processSensorDataObj = {};
  completedProcessData.processSensorStats = {};

  //var s3 = new AWS.S3();
  documentClient = new AWS.DynamoDB.DocumentClient();

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
  // console.log("jsonRecords: ", jsonRecords);

  // 2. Get facility ID and process ID from the first record:
  completedProcessData.facilityId = jsonRecords[0].facilityId;
  completedProcessData.processId = jsonRecords[0].processId;
  console.log("ProcessID: ", completedProcessData.processId);

  // 3. Get completed process data for each sensor:
  await getProcessSensorData(jsonRecords);

  // 4. Calculate completed process stats for each sensor:
  await getProcessSensorStats();

  // 5. Save completed process stats for each sensor to DDB table:
  await saveProcessSensorStats();
};

const getProcessSensorData = async (jsonRecords) => {
  try {
    jsonRecords.map((sensorDataRecord) => {
      // console.log("sensorDataRecord:", sensorDataRecord);
      // console.log(
      //   "completedProcessData.processSensorDataObj: ",
      //   completedProcessData.processSensorDataObj
      // );
      if (
        !(
          sensorDataRecord.sensorId in completedProcessData.processSensorDataObj
        )
      ) {
        completedProcessData.processSensorDataObj[
          `${sensorDataRecord.sensorId}`
        ] = {};
        completedProcessData.processSensorDataObj[
          `${sensorDataRecord.sensorId}`
        ].sensorData = {};
        completedProcessData.processSensorDataObj[
          `${sensorDataRecord.sensorId}`
        ].name = sensorDataRecord.name;
      }

      completedProcessData.processSensorDataObj[
        `${sensorDataRecord.sensorId}`
      ].sensorData[`${sensorDataRecord.second}`] = sensorDataRecord.sensorData;

      return;
    });
  } catch (error) {
    console.log("Error in getProcessSensorData(): ", error);
  }

  //  console.log("completedProcessData:", completedProcessData);
};

// TODO: refactor this into a separate lib module
const getProcessSensorStats = async () => {
  for (const [sensorId, sensorDataInfo] of Object.entries(
    completedProcessData.processSensorDataObj
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

    if (!(sensorId in completedProcessData.processSensorStats)) {
      completedProcessData.processSensorStats[`${sensorId}`] = {};
    }

    completedProcessData.processSensorStats[`${sensorId}`].min_val = min_val;
    completedProcessData.processSensorStats[`${sensorId}`].max_val = max_val;
    completedProcessData.processSensorStats[`${sensorId}`].median_val =
      median_val;
    completedProcessData.processSensorStats[`${sensorId}`].stddev_val =
      stddev_val;
    completedProcessData.processSensorStats[`${sensorId}`].name =
      sensorDataInfo.name;

    // console.log(
    //   "completedProcessData.processSensorStats[sensorId]:",
    //   sensorId,
    //   completedProcessData.processSensorStats[sensorId]
    // );
  }
};

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

/*! Copyright Sergei Akopov (thecloud21.com). All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

const { gzip, gunzip } = require("./lib/gzip");

const AWS = require("aws-sdk");
AWS.config.region = process.env.AWS_REGION;
const s3 = new AWS.S3();
let facilityProcessData = {};

// Main Lambda handler
exports.handler = async (event) => {
  console.log(JSON.stringify(event, null, 2));

  const object = event.Records[0];
  console.log("Bucket name:", object.s3.bucket.name);
  console.log("Bucket key:", object.s3.object.key);

  // Load incoming records from S3 bucket written by Kinesis Data Firehose:
  const response = await s3
    .getObject({
      Bucket: object.s3.bucket.name,
      Key: object.s3.object.key,
    })
    .promise();

  // Uncompress
  // const data = await gunzip(response.Body);
  const data = response.Body;

  // Convert to JSON array
  let jsonRecords = convertToJsonArray(data.toString());
  //  console.log("jsonRecords: ", jsonRecords);
  facilityProcessData = {};

  let runningProcessRecords = checkForRunningProcessRecords(jsonRecords);
  if (runningProcessRecords.length !== 0) {
    // Append incoming sensor data records of a running process:
    // console.log(
    //   "Facility process records before append:",
    //   runningProcessRecords
    // );
    let facilityRunningProcessData = await appendToFacilityProcessData(
      runningProcessRecords
    );
    // console.log(
    //   "Facility process data after append record:",
    //   facilityRunningProcessData
    // );
    // Save combined sensor data for a running process:
    await saveCurrentFacilityProcessData(facilityRunningProcessData);
  }

  // Check for completed processes:
  console.log("Calling checkForCompletedProcessRecords()");
  let completedFacilityProcessRecords =
    checkForCompletedProcessRecords(jsonRecords);
  console.log(
    "completedFacilityProcessRecords: ",
    completedFacilityProcessRecords
  );

  if (completedFacilityProcessRecords.length > 0) {
    // Save completed process data into the history bucket:
    await saveCompletedProcessData(completedFacilityProcessRecords);
  }
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

const checkForCompletedProcessRecords = (currentRecords) => {
  let completedProcessRecords = [];
  // console.log("currentRecords: ", currentRecords);

  completedProcessRecords = currentRecords.filter(
    (record) => record.event === "complete"
  );

  // console.log("completedProcessRecords:", completedProcessRecords);
  return completedProcessRecords;
};

const checkForRunningProcessRecords = (jsonRecords) => {
  let runningProcessRecords = [];

  runningProcessRecords = jsonRecords.filter(
    (record) => record.event !== "complete"
  );

  return runningProcessRecords;
};

const getCurrentProcessDataPerFacility = async (jsonRecords) => {
  // Get running process data per facility:
  await Promise.all(
    jsonRecords.map(async (record) => await getFacilityProcessData(record))
  );
  console.log("getCurrentProcessDataPerFacility done");
};

const getFacilityProcessData = async (processDataRecord) => {
  // Load current facility process data from S3
  // console.log("getFacilityProcessData: ", processDataRecord);
  const facilityBucketFolder = `facility-${processDataRecord.facilityId}`;
  const facilityBucketPath =
    process.env.RuntimeProcessBucket +
    `/facility-${processDataRecord.facilityId}`;
  const facilityProcessBucketKey = `process-${processDataRecord.processId}`;

  try {
    const response = await s3
      .getObject({
        Bucket: facilityBucketPath,
        Key: facilityProcessBucketKey,
      })
      .promise();
    facilityProcessData[facilityBucketFolder][facilityProcessBucketKey] =
      JSON.parse(response.Body.toString());
  } catch (err) {
    // If this 404s, it means no previous facility process data has been saved.
    // Any other error should be logged.
    if (!err.code === "NoSuchError") {
      console.error("getFacilityProcessDataFromS3: ", err);
    }
  }
};

// Save completed process data for each facility:
const saveCompletedProcessData = async (completedProcessRecords) => {
  await Promise.all(
    completedProcessRecords.map(
      async (record) => await saveProcessDataHistoryPerFacility(record)
    )
  );
  console.log("saveCompletedProcessData done");
};

// Save process data history for a given facilityId into history S3 bucket:
const saveProcessDataHistoryPerFacility = async (processDataRecord) => {
  // Save to history bucket:
  console.log(
    "saveProcessDataHistoryPerFacility: ",
    processDataRecord.facilityId,
    processDataRecord.processId,
    process.env.HistoryBucket
  );

  const facilityBucketFolder = `facility-${processDataRecord.facilityId}`;
  const facilityRuntimeBucketPath =
    process.env.RuntimeProcessBucket +
    `/facility-${processDataRecord.facilityId}`;
  const facilityProcessBucketKey = `process-${processDataRecord.processId}`;

  let completedProcessData = {};
  console.log("Getting completed process data from runtime process bucket ");
  let responseBodyString = "";
  try {
    const response = await s3
      .getObject({
        Bucket: facilityRuntimeBucketPath,
        Key: facilityProcessBucketKey,
      })
      .promise();
    responseBodyString = response.Body.toString();
    completedProcessData[facilityBucketFolder] = JSON.parse(responseBodyString);
  } catch (err) {
    // If this 404s, it means no previous facility process data has been saved.
    // Any other error should be logged.
    if (!err.code === "NoSuchError") {
      console.error("completedProcessDataPerFacility: ", err);
    }
  }

  let historyBucketPath =
    process.env.HistoryBucket + `/facility-${processDataRecord.facilityId}`;
  console.log("Storing data for process ID: ", processDataRecord.processId);
  await s3
    .putObject({
      Bucket: historyBucketPath,
      Key: facilityProcessBucketKey,
      ContentType: "application/json",
      Body: responseBodyString,
      ACL: "public-read",
    })
    .promise();
  console.log(
    "Saved process data to HistoryBucket: ",
    processDataRecord.processId
  );
};

// Save existing facility process data for each facility ID
const saveCurrentFacilityProcessData = async (runningProcessData) => {
  for (const [facilityId, processDataRecords] of Object.entries(
    runningProcessData
  )) {
    //  console.log(facilityId, processDataRecords);
    await saveFacilityProcessData(facilityId, processDataRecords);
  }

  console.log("saveCurrentFacilityProcessData done");
};

const saveFacilityProcessData = async (
  facilityId,
  facilityProcessDataRecords
) => {
  // Save to intermediate bucket:
  // console.log(
  //   "saveFacilityProcessData() facilityProcessDataRecords: ",
  //   facilityId,
  //   facilityProcessDataRecords
  // );

  for (const [facilityProcessId, processDataRecords] of Object.entries(
    facilityProcessDataRecords
  )) {
    const facilityBucketFolder = facilityId;
    const facilityBucketPath =
      process.env.RuntimeProcessBucket + `/` + facilityId;
    const facilityProcessBucketKey = facilityProcessId;

    // console.log(
    //   "saveFacilityProcessData: ",
    //   facilityId,
    //   facilityProcessId,
    //   process.env.RuntimeProcessBucket
    // );

    let currentS3ProcessData = {};
    currentS3ProcessData[facilityBucketFolder] = {};
    currentS3ProcessData[facilityBucketFolder][facilityProcessBucketKey] = [];

    try {
      const response = await s3
        .getObject({
          Bucket: facilityBucketPath,
          Key: facilityProcessBucketKey,
        })
        .promise();
      currentS3ProcessData[facilityBucketFolder][facilityProcessBucketKey] =
        JSON.parse(response.Body.toString());
      // console.log(
      //   "currentS3ProcessData after reading S3:",
      //   currentS3ProcessData
      // );
    } catch (err) {
      // If this 404s, it means no previous facility process data has been saved.
      // Any other error should be logged.
      if (!err.code === "NoSuchError") {
        console.error("getFacilityProcessDataFromS3: ", err);
      }
    }

    console.log(
      "Length of additional data to save:",
      facilityProcessBucketKey,
      currentS3ProcessData[facilityBucketFolder][facilityProcessBucketKey]
        .length
    );

    processDataRecords.map((record) => {
      currentS3ProcessData[facilityBucketFolder][facilityProcessBucketKey].push(
        record
      );
    });

    console.log(
      "Length of total data to save:",
      facilityProcessBucketKey,
      currentS3ProcessData[facilityBucketFolder][facilityProcessBucketKey]
        .length
    );

    const Body = JSON.stringify(
      currentS3ProcessData[facilityBucketFolder][facilityProcessBucketKey]
    );

    await s3
      .putObject({
        Bucket: facilityBucketPath,
        Key: facilityProcessBucketKey,
        ContentType: "application/json",
        Body,
        ACL: "public-read",
      })
      .promise();
    console.log("Saved to S3: ", facilityId, facilityProcessId);
  }
};

const appendToFacilityProcessData = async (runningProcessRecords) => {
  // Iterate through batch and add payload process data record
  let runningProcessData = {};
  runningProcessRecords.map((record) => {
    let facilityId = `facility-${record.facilityId}`;
    let processId = `process-${record.processId}`;

    // If sensor data for this facility process is missing, save it
    if (!runningProcessData[facilityId]) {
      runningProcessData[facilityId] = {};
      runningProcessData[facilityId][processId] = [];

      //  console.log("In !facilityProcessData[facilityId]");
      return runningProcessData[facilityId][processId].push(record);
    }

    if (!runningProcessData[facilityId][processId]) {
      runningProcessData[facilityId][processId] = [];

      //  console.log("In !runningProcessData[facilityId][processId]");
      return runningProcessData[facilityId][processId].push(record);
    }

    //  console.log("Append payload record: ", record);
    return runningProcessData[facilityId][processId].push(record);
  });

  return runningProcessData;
};

/*! Copyright Sergei Akopov (thecloud21.com). All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

const { gzip, gunzip } = require("./lib/gzip");

const AWS = require("aws-sdk");
AWS.config.region = process.env.AWS_REGION;
const s3 = new AWS.S3();
const documentClient = new AWS.DynamoDB.DocumentClient();

//let sensorMap = {};
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
  // SAK TEMP???
  // const data = await gunzip(response.Body);
  const data = response.Body;

  // Convert to JSON array
  let jsonRecords = convertToJsonArray(data.toString());
  console.log("jsonRecords: ", jsonRecords);
  facilityProcessData = {};

  let runningProcessRecords = checkForRunningProcessRecords(jsonRecords);
  if (runningProcessRecords.length !== 0) {
    // Append incoming sensor data records of a running process:
    console.log(
      "Facility process records before append:",
      runningProcessRecords
    );
    let facilityRunningProcessData = await appendToFacilityProcessData(
      runningProcessRecords
    );
    console.log(
      "Facility process data after append record:",
      facilityRunningProcessData
    );
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
  console.log("currentRecords: ", currentRecords);
  // currentRecords.map((record) => {
  //   if (record.event === "complete") {
  //     console.log("process complete! ", record);
  //     completedProcessRecords.push(record);
  //   }
  // });

  completedProcessRecords = currentRecords.filter(
    (record) => record.event === "complete"
  );

  console.log("completedProcessRecords:", completedProcessRecords);
  return completedProcessRecords;
};

const checkForRunningProcessRecords = (jsonRecords) => {
  let runningProcessRecords = [];
  // jsonRecords.map((record) => {
  //   if (record.event !== "complete") {
  //     runningProcessRecords.push(record);
  //   }
  // });

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
  console.log("getFacilityProcessData: ", processDataRecord);
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
  try {
    const response = await s3
      .getObject({
        Bucket: facilityRuntimeBucketPath,
        Key: facilityProcessBucketKey,
      })
      .promise();
    completedProcessData[facilityBucketFolder] = JSON.parse(
      response.Body.toString()
    );
  } catch (err) {
    // If this 404s, it means no previous facility process data has been saved.
    // Any other error should be logged.
    if (!err.code === "NoSuchError") {
      console.error("completedProcessDataPerFacility: ", err);
    }
  }

  const Body = JSON.stringify(completedProcessData[facilityBucketFolder]);
  let historyBucketPath =
    process.env.HistoryBucket + `/facility-${processDataRecord.facilityId}`;
  console.log("Storing data for process ID: ", processDataRecord.processId);
  await s3
    .putObject({
      Bucket: historyBucketPath,
      Key: facilityProcessBucketKey,
      ContentType: "application/json",
      Body,
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
  //let facilityIds = getFacilityIds(jsonRecords);
  // await Promise.all(
  //   facilityIds.map(
  //     async (facilityId) => await saveFacilityProcessData(facilityId)
  //   )
  // );

  // await Promise.all(
  //   jsonRecords.map(async (record) => await saveFacilityProcessData(record))
  // );

  //await Promise.all(
  for (const [facilityId, processDataRecords] of Object.entries(
    runningProcessData
  )) {
    console.log(facilityId, processDataRecords);
    await saveFacilityProcessData(facilityId, processDataRecords);
  }

  console.log("saveCurrentFacilityProcessData done");
};

const saveFacilityProcessData = async (
  facilityId,
  facilityProcessDataRecords
) => {
  // Save to intermediate bucket:
  console.log(
    "saveFacilityProcessData() facilityProcessDataRecords: ",
    facilityId,
    facilityProcessDataRecords
  );

  for (const [facilityProcessId, processDataRecords] of Object.entries(
    facilityProcessDataRecords
  )) {
    const facilityBucketFolder = facilityId;
    const facilityBucketPath =
      process.env.RuntimeProcessBucket + `/` + facilityId;
    const facilityProcessBucketKey = facilityProcessId;

    console.log(
      "saveFacilityProcessData: ",
      facilityId,
      facilityProcessId,
      process.env.RuntimeProcessBucket
    );

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
      console.log(
        "currentS3ProcessData after reading S3:",
        currentS3ProcessData
      );
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

      console.log("In !facilityProcessData[facilityId]");
      return runningProcessData[facilityId][processId].push(record);
    }

    if (!runningProcessData[facilityId][processId]) {
      runningProcessData[facilityId][processId] = [];

      console.log("In !runningProcessData[facilityId][processId]");
      return runningProcessData[facilityId][processId].push(record);
    }

    console.log("Append payload record: ", record);
    return runningProcessData[facilityId][processId].push(record);
  });

  return runningProcessData;
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

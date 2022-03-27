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

  // jsonRecords = runningProcessRecords;
  const recordsBySensorId = getRecordsBySensorId(runningProcessRecords);

  //await getFacilityProcessData(jsonRecords);

  // Load intermediate run-time data of a running facility process
  //await getCurrentProcessDataPerFacility(runningProcessRecords);

  // Append incoming sensor data records of a running process:
  appendToFacilityProcessData(runningProcessRecords);

  // Save combined sensor data for a running process:
  await saveCurrentFacilityProcessData(runningProcessRecords);

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

const checkForCompletedProcessRecords = (currentRecords) => {
  let completedProcessRecords = [];
  console.log("currentRecords: ", currentRecords);
  currentRecords.map((record) => {
    if (record.event === "complete") {
      console.log("process complete! ", record);
      completedProcessRecords.push(record);
    }
  });
  console.log("completedProcessRecords:", completedProcessRecords);
  return completedProcessRecords;
};

const checkForRunningProcessRecords = (jsonRecords) => {
  let runningProcessRecords = [];
  jsonRecords.map((record) => {
    if (record.event !== "complete") {
      runningProcessRecords.push(record);
    }
  });
  return runningProcessRecords;
};

// Helper function to return distinct array of facility IDs from records
const getFacilityIds = (jsonRecords) => {
  const facilityIdsAll = jsonRecords.map((record) => record.facilityId);
  console.log("facilityIdsAll", facilityIdsAll);
  facilityIds = [...new Set(facilityIdsAll)];
  return facilityIds;
};

// Load current process data per facility in the batch
// const getCurrentProcessDataPerFacility = async (jsonRecords) => {
//   // Return list of facility IDs referenced in this batch of sensor data records
//   let facilityIds = getFacilityIds(jsonRecords);
//   await Promise.all(
//     facilityIds.map(
//       async (facilityId) => await getFacilityProcessData(facilityId)
//     )
//   );
//   console.log("getCurrentProcessDataPerFacility done");
// };

const getCurrentProcessDataPerFacility = async (jsonRecords) => {
  // Get running process data per facility:
  await Promise.all(
    jsonRecords.map(async (record) => await getFacilityProcessData(record))
  );
  console.log("getCurrentProcessDataPerFacility done");
};

// Load intermediate sensor data for a process running in a facility:
// const getFacilityProcessData = async (facilityId) => {
//   // Load current facility process data from S3
//   console.log("getFacilityProcessData: ", facilityId);
//   try {
//     const response = await s3
//       .getObject({
//         Bucket: process.env.RuntimeProcessBucket,
//         Key: `facility-${facilityId}`,
//       })
//       .promise();
//     facilityProcessData[`facility-${facilityId}`] = JSON.parse(
//       response.Body.toString()
//     );
//   } catch (err) {
//     // If this 404s, it means no previous facility process data has been saved.
//     // Any other error should be logged.
//     if (!err.code === "NoSuchError") {
//       console.error("getFacilityProcessDataFromS3: ", err);
//     }
//   }
// };

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
const saveCurrentFacilityProcessData = async (jsonRecords) => {
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
    facilityProcessData
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

    console.log(
      "Length of data to save:",
      facilityProcessData[facilityBucketFolder][facilityProcessBucketKey].length
    );

    const Body = JSON.stringify(
      facilityProcessData[facilityBucketFolder][facilityProcessBucketKey]
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

const appendToFacilityProcessData = async (jsonRecords) => {
  // Iterate through batch and add payload process data record
  jsonRecords.map((record) => {
    let facilityId = `facility-${record.facilityId}`;
    let processId = `process-${record.processId}`;

    // If sensor data for this facility process is missing, save it
    if (!facilityProcessData[facilityId]) {
      facilityProcessData[facilityId] = {};
      facilityProcessData[facilityId][processId] = [];

      console.log("In !facilityProcessData[facilityId]");
      return facilityProcessData[facilityId][processId].push(record);
    }

    if (!facilityProcessData[facilityId][processId]) {
      facilityProcessData[facilityId][processId] = [];

      console.log("In !facilityProcessData[facilityId][processId]");
      return facilityProcessData[facilityId][processId].push(record);
    }

    console.log("Append payload record: ", record);
    return facilityProcessData[facilityId][processId].push(record);
  });
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

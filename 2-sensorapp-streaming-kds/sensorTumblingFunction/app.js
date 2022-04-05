/*! Copyright Sergei Akopov (thecloud21.com). All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

const AWS = require("aws-sdk");
AWS.config.region = process.env.AWS_REGION;
const documentClient = new AWS.DynamoDB.DocumentClient();

let processMap = {};

// Main Lambda handler
exports.handler = async (event) => {
  console.log(`Received sensor data: ${event.Records.length} messages`);
  // console.log(JSON.stringify(event, null, 2))

  // Retrieve existing state passed during tumbling window
  let state = event.state || {};

  // Get sensor data of a process from event
  let jsonRecords = getRecordsFromPayload(event);
  jsonRecords.map(
    (record) => (processMap[record.processId] = record.facilityId)
  );
  console.log(JSON.stringify(jsonRecords, null, 2));

  state = getSensorDataByProcessId(state, jsonRecords);
  //console.log(JSON.stringify(state, null, 2))
  // If tumbling window is not configured, save and exit
  if (event.window === undefined) {
    return await saveCurrentSensorData(state);
  }

  // If tumbling window is configured, save to DDB on the
  // final invoke window
  if (event.isFinalInvokeForWindow) {
    await saveCurrentSensorData(state);
  } else {
    //	console.log('Returning state: ', JSON.stringify(state, null, 2))
    return { state };
  }
};

// Helper function - decimal rounding
const round = (value, decimals) => {
  return Number(Math.round(value + "e" + decimals) + "e-" + decimals);
};

// Save latest process sensor data to DDB table
const saveCurrentSensorData = async (processSensorData) => {
  //	console.log('Saving to DDB:', processSensorData)
  let paramsArr = [];

  // Retrieve existing sensor data of the process and add new data:
  for (let processId in processSensorData) {
    //	console.log('Saving :', processId, processSensorData[processId])

    // Get existing state from DDB
    const data = await documentClient
      .get({
        TableName: process.env.DDB_TABLE,
        Key: {
          PK: `process-${processId}`,
          SK: `results`,
        },
      })
      .promise();

    let results = data.Item ? JSON.parse(data.Item.results) : {};

    // Add latest results to existing state
    for (let sensorId in processSensorData[processId]) {
      results[sensorId] = processSensorData[processId][sensorId];
    }

    // Save latest sensor data back to DDB table
    const response = await documentClient
      .put({
        TableName: process.env.DDB_TABLE,
        Item: {
          PK: `process-${processId}`,
          SK: `results`,
          GSI: processMap[processId],
          results: JSON.stringify(results),
          ts: Date.now(),
        },
      })
      .promise();
  }

  console.log("saveCurrentSensorData done");
};

// Convert event payload to JSON records
const getRecordsFromPayload = (event) => {
  let jsonRecords = [];
  // Get records from event payload
  event.Records.map((record) => {
    // Extract JSON record from base64 data
    const buffer = Buffer.from(record.kinesis.data, "base64").toString();
    const jsonRecord = JSON.parse(buffer);

    // jsonRecord.output = jsonRecord.sensorData;
    jsonRecords.push(jsonRecord);
  });
  return jsonRecords;
};

// Appends records to existing state, returning results
// grouped by processId with latest data by sensorId
const getSensorDataByProcessId = (state, jsonRecords) => {
  console.log("getSensorDataByProcessId: ", state);
  jsonRecords.map((record) => {
    // Add processId if not in state
    if (!state[record.processId]) {
      state[record.processId] = {};
    }

    state[record.processId][record.sensorId] = record.sensorData;

    // Add sensorId if not in state
    // if (!state[record.processId][record.sensorId]) {
    //   state[record.processId][record.sensorId] = record.sensorData;
    //   return;
    // }
  });

  return state;
};

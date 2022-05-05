/*! Copyright Sergei Akopov (thecloud21.com). All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

const AWS = require("aws-sdk");
const iotdata = new AWS.IotData({ endpoint: process.env.IOT_DATA_ENDPOINT });
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
  // If tumbling window is not configured, publish and exit
  if (event.window === undefined) {
    console.log("Tumbling window is not configured!");
    // return await saveCurrentSensorData(state);
    return await publishToIoT(state);
  }

  // If tumbling window is configured, publish to IoT endpoint on the
  // final invoke window:
  if (event.isFinalInvokeForWindow) {
    console.log("Final invoke state: ", JSON.stringify(state, null, 2));
    // await saveCurrentSensorData(state);
    await publishToIoT(state);
  } else {
    console.log("Returning state: ", JSON.stringify(state, null, 2));
    return { state };
  }
};

const publishToIoT = async (processSensorData) => {
  let promises = [];
  for (let processId in processSensorData) {
    const JSONpayload = {
      msg: "sensordata",
      facilityId: processMap[processId],
      processId: `process-${processId}`,
      ts: Date.now(),
      sensordata: JSON.stringify(processSensorData[processId]),
    };

    let promise = iotdata
      .publish({
        topic: process.env.TOPIC,
        qos: 0,
        payload: JSON.stringify(JSONpayload),
      })
      .promise();
    promises.push(promise);
  }

  // Wait for all promises to be settled
  const results = await Promise.allSettled(promises);

  // Log out any rejected results
  results.map((result) =>
    result.status === "rejected" ? console.log(result) : null
  );
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

// Process records and return sensor data grouped by processId:
const getSensorDataByProcessId = (state, jsonRecords) => {
  console.log("getSensorDataByProcessId: ", state);
  jsonRecords.map((record) => {
    // Add processId if not in state
    if (!state[record.processId]) {
      state[record.processId] = {};
    }

    // NOTE: This is here for demonstration purposes only. In case the tumbling window
    // is configured, here we can do additional processing based on the previous state.
    // For example, if we need to perform some calculation or aggregation of sensor data
    // based on certain time window.
    state[record.processId][record.sensorId] = record.sensorData;
  });

  // TODO: we don't need to return here
  return state;
};

/*! Copyright Sergei Akopov (thecloud21.com). All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

const AWS = require("aws-sdk");
const { getStandardDevitation } = require("./lib/mathlib.js");

const iotdata = new AWS.IotData({ endpoint: process.env.IOT_DATA_ENDPOINT });
AWS.config.region = process.env.AWS_REGION;

let processMap = {};

// Main Lambda handler
exports.handler = async (event) => {
  console.log(`Received sensor data: ${event.Records.length} messages`);
  console.log(JSON.stringify(event, null, 2));

  let jsonRecords = getRecordsFromPayload(event.Records);

  // Check for the "complete" event:
  const completedProcessRecords = jsonRecords.filter(
    (record) => record.event === "complete"
  );

  // If the "complete" event was issued, then we need to check the current state,
  // and, if the total number of data points for each sensor is less than 15, then we
  // ignore those values, and return without publishing any new aggregate stats:
  if (completedProcessRecords.length !== 0) {
    console.log("Received 'complete' message!");
    // Check if there are any current data records passed from the data stream:
    const sensorDataRecords = jsonRecords.filter(
      (record) => record.event === "update"
    );

    console.log("sensorDataRecords:", sensorDataRecords);

    // Retrieve existing state passed during tumbling window
    let state = event.state || {};

    jsonRecords.map(
      (record) => (processMap[record.processId] = record.facilityId)
    );

    let toBePublished = false;
    if (sensorDataRecords.length !== 0) {
      getSensorDataByProcessId(state, sensorDataRecords);
    }

    toBePublished = checkIfSensorDataShouldBePublished(
      state,
      sensorDataRecords
    );

    console.log("toBePublished:", toBePublished);
    if (toBePublished) {
      console.log("Publish last sensor stats after complete event");
      await publishToIoT(state);
    }

    console.log("Done publishing stats per last minute for the process");
    if (event.isFinalInvokeForWindow) {
      console.log("This is finalInvokeForWindow after complete event");
      // We don't need the state anymore, just return:
      return;
    } else {
      // We need to return the state object here since this is not
      // the final invoke window:
      state = {};
      return { state };
    }
  }
  // There was no "complete" event in the payload records:
  else {
    // Retrieve existing state passed during tumbling window
    let state = event.state || {};

    // Get sensor data of a process from event
    jsonRecords.map(
      (record) => (processMap[record.processId] = record.facilityId)
    );
    console.log("Payload records: ", JSON.stringify(jsonRecords, null, 2));

    getSensorDataByProcessId(state, jsonRecords);

    // Since tumbling window is configured, publish to IoT endpoint
    // on the final invoke window:
    if (event.isFinalInvokeForWindow) {
      // Make sure the state is not empty before publishing to IoT.
      // This is the use case when the 'complete' event has been already processed
      // during the window invocation that wasn't final.
      if (Object.entries(state).length === 0) {
        console.log("isFinalInvokeForWindow but the state is empty.");
        return;
      }

      console.log("Final invoke state: ", JSON.stringify(state, null, 2));
      await publishToIoT(state);
    } else {
      console.log("Returning state: ", JSON.stringify(state, null, 2));
      return { state };
    }
  }
};

const publishToIoT = async (processSensorData) => {
  let promises = [];
  let payloadObjectArray = [];
  for (let processId in processSensorData) {
    for (const [sensorId, sensorDataInfo] of Object.entries(
      processSensorData[processId]
    )) {
      console.log("sensorDataInfo: ", sensorDataInfo);
      const payloadObject = {
        name: sensorDataInfo.name,
        sensorId: sensorId,
        deviceTimestamp: Date.now(),
        min_value: Math.min(...sensorDataInfo.sensorData),
        max_value: Math.max(...sensorDataInfo.sensorData),
        stddev_value: getStandardDevitation(sensorDataInfo.sensorData),
      };
      payloadObjectArray.push(payloadObject);
    }
    const JSONpayload = {
      msg: "sensorstats",
      facilityId: processMap[processId],
      processId: `process-${processId}`,
      sensorstats: JSON.stringify(payloadObjectArray),
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
const getRecordsFromPayload = (eventRecords) => {
  let jsonRecords = [];
  // Get records from event payload
  eventRecords.map((record) => {
    // Extract JSON record from base64 data
    const buffer = Buffer.from(record.kinesis.data, "base64").toString();
    const jsonRecord = JSON.parse(buffer);

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

    if (!state[record.processId][record.sensorId]) {
      state[record.processId][record.sensorId] = {};
      state[record.processId][record.sensorId].sensorData = [];
      state[record.processId][record.sensorId].name = record.name;
    }
    state[record.processId][record.sensorId].sensorData.push(record.sensorData);
  });
};

const checkIfSensorDataShouldBePublished = (state, jsonRecords) => {
  console.log("checkIfSensorDataShouldBePublished state: ", state);
  let isPublishable = false;
  if (jsonRecords.length !== 0) {
    jsonRecords.map((record) => {
      // Add processId if not in state
      if (!state[record.processId]) {
        state[record.processId] = {};
      }

      if (!state[record.processId][record.sensorId]) {
        state[record.processId][record.sensorId] = {};
        state[record.processId][record.sensorId].sensorData = [];
        state[record.processId][record.sensorId].name = record.name;
      }
      state[record.processId][record.sensorId].sensorData.push(
        record.sensorData
      );
      if (state[record.processId][record.sensorId].sensorData.length >= 15) {
        isPublishable = true;
      }
    });
  } else {
    for (const [processId, processSensorDataState] of Object.entries(state)) {
      for (const [sensorId, sensorDataInfo] of Object.entries(
        processSensorDataState
      )) {
        if (sensorDataInfo.sensorData.length >= 15) {
          console.log(
            `sensorDataInfo: ${sensorDataInfo}, sensordata: ${sensorDataInfo.sensorData} is publishable`
          );
          isPublishable = true;
        }
      }
    }
  }

  return isPublishable;
};



/*! Copyright Sergei Akopov (thecloud21.com). All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

const AWS = require("aws-sdk");
const iotdata = new AWS.IotData({ endpoint: process.env.IOT_DATA_ENDPOINT });
AWS.config.region = process.env.AWS_REGION;

// Main Lambda handler
exports.handler = async (event) => {
  console.log(`Received sensor data: ${event.Records.length} messages`);
  console.log(JSON.stringify(event, null, 2));

  let processMap = {};
  // Get sensor data of a process from event
  let jsonRecords = getRecordsFromPayload(event);
  console.log(JSON.stringify(jsonRecords, null, 2));

  getSensorDataByProcessId(processMap, jsonRecords);
  return await publishToIoT(processMap);
};

const publishToIoT = async (processMap) => {
  let promises = [];
  for (let processId in processMap) {
    const JSONpayload = {
      msg: "sensordata",
      facilityId: processMap[processId].facilityId,
      processId: `process-${processId}`,
      sensordata: JSON.stringify(processMap[processId]),
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

    jsonRecords.push(jsonRecord);
  });
  return jsonRecords;
};

const getSensorDataByProcessId = (processMap, jsonRecords) => {
  console.log("getSensorDataByProcessId: ", processMap);
  jsonRecords.map((record) => {
    // Add processId if not in processMap
    if (!processMap[record.processId]) {
      processMap[record.processId] = {};
      processMap[record.processId].facilityId = record.facilityId;
    }

    processMap[record.processId][record.sensorId] = record.sensorData;
  });
};

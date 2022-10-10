/*! Copyright Sergei Akopov (thecloud21.com). All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

const AWS = require("aws-sdk");
const iotdata = new AWS.IotData({ endpoint: process.env.IOT_DATA_ENDPOINT });

exports.handler = async (event) => {
  console.log(`Received sensor stats: ${event.records.length} messages`);
  console.log(JSON.stringify(event, null, 2));

  const results = await publishSensorStatsToIoT(event.records);
  console.log("results:", results);

  return { records: results };
};

const publishSensorStatsToIoT = async (records) => {
  let success = 0;
  let failure = 0;
  let processMap = {};

  records.map((record) => {
    const payload = Buffer.from(record.data, "base64").toString("ascii");
    console.log("Payload for sensor stats: ", payload);
    const payloadObject = JSON.parse(payload);

    // Sort out sensor stats messages per facility and per process for
    // each facility. Note that currently the simulator only assumes
    // one facility and one running process:
    if (!processMap[payloadObject.facilityId]) {
      processMap[payloadObject.facilityId] = {};
      processMap[payloadObject.facilityId][payloadObject.processId] = {};
      processMap[payloadObject.facilityId][payloadObject.processId][
        payloadObject.sensorId
      ] = {};
    } else if (!processMap[payloadObject.facilityId][payloadObject.processId]) {
      processMap[payloadObject.facilityId][payloadObject.processId] = {};
      processMap[payloadObject.facilityId][payloadObject.processId][
        payloadObject.sensorId
      ] = {};
    } else if (
      !processMap[payloadObject.facilityId][payloadObject.processId][
        payloadObject.sensorId
      ]
    ) {
      processMap[payloadObject.facilityId][payloadObject.processId][
        payloadObject.sensorId
      ] = {};
    }

    processMap[payloadObject.facilityId][payloadObject.processId][
      payloadObject.sensorId
    ].payload = payloadObject;

    // After messages are published, we must return
    // the recordId(s) and the result(s) back to KDA application:
    processMap[payloadObject.facilityId][payloadObject.processId][
      payloadObject.sensorId
    ].output = {
      recordId: record.recordId,
      result: "",
    };
  });

  let payloadObjectArray = [];
  let promises = [];

  // Publish sensor stats per running process to IoT topic:
  for (let facilityId in processMap) {
    for (let processId in processMap[facilityId]) {
      for (const [sensorId, sensorDataInfo] of Object.entries(
        processMap[facilityId][processId]
      )) {
        payloadObjectArray.push(sensorDataInfo.payload);
      }

      // console.log("payloadObject:", payloadObject);
      const JSONpayload = {
        msg: "sensorstats",
        facilityId: facilityId,
        processId: `proc-${processId}`,
        sensorstats: JSON.stringify(payloadObjectArray),
      };

      try {
        let promise = iotdata
          .publish({
            topic: process.env.TOPIC,
            qos: 0,
            payload: JSON.stringify(JSONpayload),
          })
          .promise();
        promises.push(promise);

        success++;

        // Set the result for each sensor data record of the process to "Ok":
        for (const [sensorId, sensorDataInfo] of Object.entries(
          processMap[facilityId][processId]
        )) {
          processMap[facilityId][processId][sensorId].output.result = "Ok";
        }
      } catch (err) {
        failure++;
        console.error(err);

        // Set the result for each sensor data record of the process to "DeliveryFailed":
        for (const [sensorId, sensorDataInfo] of Object.entries(
          processMap[facilityId][processId]
        )) {
          processMap[facilityId][processId][sensorId].output.result =
            "DeliveryFailed";
        }
      }

      console.log(
        `Successfully delivered records ${success}, Failed delivered records ${failure}.`
      );

      const results = await Promise.allSettled(promises);
      results.map((result) =>
        result.status === "rejected"
          ? console.log("Promise rejected:", result)
          : null
      );
    }
  }

  let output = [];
  for (let facilityId in processMap) {
    for (let processId in processMap[facilityId]) {
      for (let sensorId in processMap[facilityId][processId]) {
        output.push(processMap[facilityId][processId][sensorId].output);
      }
    }
  }

  console.log("output:", output);
  return output;
};

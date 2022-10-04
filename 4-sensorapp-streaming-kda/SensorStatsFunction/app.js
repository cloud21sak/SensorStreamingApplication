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

  const promises = records.map(async (record) => {
    const payload = Buffer.from(record.data, "base64").toString("ascii");
    console.log("Payload for sensor stats: ", payload);
    const payloadObject = JSON.parse(payload);
    // payloadObject.deviceTimestamp = new Date(Date.now()).toLocaleTimeString(
    //   "en-US"
    // );
    payloadObject.deviceTimestamp = Date.now();

    // *****************************************************************
    // Note this is for compatibility with "sensorStatsByLatestMinute
    // tumbling window Lambda function:
    let payloadObjectArray = [];
    payloadObjectArray.push(payloadObject);
    // ******************************************************************

    console.log("payloadObject:", payloadObject);
    const JSONpayload = {
      msg: "sensorstats",
      facilityId: payloadObject.facilityId,
      processId: `proc-${payloadObject.processId}`,
      //sensorstats: JSON.stringify(payloadObject),
      sensorstats: JSON.stringify(payloadObjectArray),
    };

    try {
      iotdata
        .publish({
          topic: process.env.TOPIC,
          qos: 0,
          payload: JSON.stringify(JSONpayload),
        })
        .promise();

      success++;

      return {
        recordId: record.recordId,
        result: "Ok",
      };
    } catch (err) {
      failure++;
      console.error(err);

      return {
        recordId: record.recordId,
        result: "DeliveryFailed",
      };
    }
  });

  console.log(
    `Successfully delivered records ${success}, Failed delivered records ${failure}.`
  );

  const output = await Promise.all(promises);

  // *****************************************************
  // Alternative implementation using Promise.allSettled()
  // *****************************************************
  // const results = await Promise.allSettled(promises);
  // results.map((result) =>
  //   result.status === "rejected"
  //     ? console.log("Promise rejected:", result)
  //     : null
  // );
  // const output = results.map((result) => result.value);

  console.log("output:", output);

  return output;
};

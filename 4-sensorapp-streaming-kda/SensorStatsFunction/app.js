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
  return results;
};

const publishSensorStatsToIoT = async (records) => {
  let success = 0;
  let failure = 0;

  const promises = records.map(async (record) => {
    const payload = Buffer.from(record.data, "base64").toString("ascii");
    console.log("Payload for sensor stats: ", payload);
    const payloadObject = JSON.parse(payload);
    payloadObject.deviceTimestamp = Date.now();

    console.log("payloadObject:", payloadObject);
    const JSONpayload = {
      msg: "sensorstats",
      sensorstats: JSON.stringify(payloadObject),
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
  const output = await Promise.allSettled(promises);

  output.map((result) =>
    result.status === "rejected"
      ? console.log("Promise rejected:", result)
      : null
  );
  return { records: output };
};

// const promises = event.records.map(async (record) => {
//   //event.records.map((record) => {
//   const payload = Buffer.from(record.data, "base64").toString("ascii");
//   console.log("Payload for sensor stats: ", payload);

//   // const payloadObjectRecord = {};
//   const payloadObject = JSON.parse(payload);
//   payloadObject.deviceTimestamp = Date.now();

//   try {
//     console.log("payloadObject:", payloadObject);
//     const JSONpayload = {
//       msg: "sensorstats",
//       sensorstats: JSON.stringify(payloadObject),
//     };

//     iotdata
//       .publish({
//         topic: process.env.TOPIC,
//         qos: 0,
//         payload: JSON.stringify(JSONpayload),
//       })
//       .promise();

//     success++;

//     return {
//       recordId: record.recordId,
//       result: "Ok",
//     };
//   } catch (err) {
//     failure++;
//     console.error(err);

//     return {
//       recordId: record.recordId,
//       result: "DeliveryFailed",
//     };
//   }
// });

// console.log(
//   `Successfully delivered records ${success}, Failed delivered records ${failure}.`
// );

//const output = await Promise.all(promises);
// const output = await Promise.allSettled(promises);
// Log out any rejected results
// output.map((result) =>
//   result.status === "rejected"
//     ? console.log("Promise rejected:", result)
//     : null
// );
// console.log(output);

//   return { records: output };
// };

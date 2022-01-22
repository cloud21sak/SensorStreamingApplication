/*! Copyright Sergei Akopov (thecloud21.com). All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

const AWS = require("aws-sdk");
const iotdata = new AWS.IotData({ endpoint: process.env.IOT_DATA_ENDPOINT });

exports.handler = async (event) => {
  console.log(`Received sensor stats: ${event.records.length} messages`);
  console.log(JSON.stringify(event, null, 2));
  let success = 0;
  let failure = 0;

  const promises = event.records.map(async (record) => {
    const payload = Buffer.from(record.data, "base64").toString("ascii");
    console.log("Payload for sensor stats: ", payload);

    const payloadObject = JSON.parse(payload);

    try {
      /*
       * Note: Write logic here to deliver the record data to the
       * destination of your choice
       */

      const JSONpayload = {
        msg: "sensorstats",
        sensorstats: JSON.stringify(payloadObject),
      };

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
    `Successful delivered records ${success}, Failed delivered records ${failure}.`
  );
  const output = await Promise.all(promises);
  console.log(output);

  return { records: output };
};

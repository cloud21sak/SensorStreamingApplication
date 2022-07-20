/*! Copyright Sergei Akopov (thecloud21.com). All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

const AWS = require("aws-sdk");
const iotdata = new AWS.IotData({ endpoint: process.env.IOT_DATA_ENDPOINT });

exports.handler = async (event) => {
  console.log(JSON.stringify(event, null, 2));

  // Ignore deletions
  let messages = event.Records.filter((record) => record.eventName != "REMOVE");

  // Process only completed stats messages (ignore others)
  // to get completed processes' IDs:
  messages = messages.filter(
    (record) => record.dynamodb.NewImage.SK.S === "completedstats"
  );

  // Send to IOT Core
  if (messages.length > 0) await publishCompletedProcInfoToIoT(messages);
};

const publishCompletedProcInfoToIoT = async (messages) => {
  //  console.log("PublishCompletedProcessStats messages:", messages);
  // Get promises for IoT delivery
  const promises = messages.map(async (record) => {
    const JSONpayload = {
      msg: "completedprocinfo",
      facilityId: record.dynamodb.NewImage.GSI.N,
      processId: record.dynamodb.NewImage.PK.S,
    };

    return iotdata
      .publish({
        topic: process.env.TOPIC,
        qos: 0,
        payload: JSON.stringify(JSONpayload),
      })
      .promise();
  });

  // Wait for all promises to be settled
  const results = await Promise.allSettled(promises);

  // Log out any rejected results
  results.map((result) =>
    result.status === "rejected" ? console.log(result) : null
  );
};

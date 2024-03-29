/*! Copyright Sergei Akopov (thecloud21.com). All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

// Mock event
const event = require("./testEvent.json");

// Mock environment variables
process.env.AWS_REGION = "us-east-1";
process.env.IOT_DATA_ENDPOINT =
  "a1dqbiklucuqp5-ats.iot.us-east-1.amazonaws.com";
process.env.TOPIC = "completed-processinfo";
process.env.localTest = true;

// Lambda handler
const { handler } = require("../app");

const main = async () => {
  console.time("localTest");

  // Testing lambda function:
  console.dir(await handler(event));

  console.timeEnd("localTest");
};

main().catch((error) => console.error(error));

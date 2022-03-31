/*! Copyright Sergei Akopov (thecloud21.com). All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

const AWS = require("aws-sdk");

AWS.config.region = process.env.AWS_REGION;
const documentClient = new AWS.DynamoDB.DocumentClient();

// Main Lambda handler
exports.handler = async (event) => {
  console.log(JSON.stringify(event, null, 2));
  const facilityId = parseInt(event.queryStringParameters.facilityId);

  const params = {
    TableName: process.env.DDB_TABLE,
    IndexName: "GSI_Index",
    KeyConditionExpression: "GSI = :gsi and begins_with(SK, :sk)",

    ExpressionAttributeValues: { ":gsi": facilityId, ":sk": "dailydata" },
    ScanIndexForward: true,
    Limit: 200,
  };

  console.log(params);
  const result = await documentClient.query(params).promise();
  console.log("result: ", result);

  let statResults = [];
  result.Items.map((item) => {
    // let sensorDailyStats = [];
    // let dailyresults = JSON.parse(item.results);
    // console.log("Daily results: ", dailyresults);
    // const min_val = Math.min(...dailyresults);
    // console.log("min_val:", min_val);
    // sensorDailyStats.push(min_val);
    // const max_val = Math.max(...dailyresults);
    // console.log("max_val:", max_val);
    // sensorDailyStats.push(max_val);
    // const median_val = median(dailyresults);
    // console.log("median_val:", median_val);
    // sensorDailyStats.push(median_val);
    //const std_dev = math.std(item.results)
    //statResults.push(std_dev)
    // console.log("sensorDailyStats: ", sensorDailyStats);
    const statsItem = {
      sensorId: item.PK,
      ts: item.ts,
      min_val: item.min_val,
      max_val: item.max_val,
      median_val: item.median_val,
      facilityId: item.GSI,
    };
    console.log("statsItem: ", statsItem)
    statResults.push(statsItem);
  });

  return statResults;
};

function median(numbers) {
  var median = 0,
    numsLen = numbers.length;
  numbers.sort((a, b) => a - b);

  if (
    numsLen % 2 ===
    0 // is even
  ) {
    // average of two middle numbers
    median = (numbers[numsLen / 2 - 1] + numbers[numsLen / 2]) / 2;
  } else {
    // is odd
    // middle number only
    median = numbers[(numsLen - 1) / 2];
  }

  return median;
}

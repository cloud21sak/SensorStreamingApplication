/*! Copyright Sergei Akopov (thecloud21.com). All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

const AWS = require("aws-sdk");

AWS.config.region = process.env.AWS_REGION;

// Main Lambda handler
exports.handler = async (event) => {
  console.log(JSON.stringify(event, null, 2));

  const documentClient = new AWS.DynamoDB.DocumentClient();
  const processId = event.queryStringParameters.processId;

  const params = {
    TableName: process.env.DDB_TABLE,
    IndexName: "LSI_PK_Index",
    KeyConditionExpression: "PK = :ID and begins_with(SK, :sk)",
    ExpressionAttributeValues: { ":ID": processId, ":sk": "completedstats" },
    ScanIndexForward: true,
    Limit: 200,
  };

  console.log(params);
  const result = await documentClient.query(params).promise();
  console.log("result: ", result);

  let statResults = [];
  result.Items.map((item) => {
    const statsItem = {
      processId: item.PK,
      facilityId: item.GSI,
      stats: item.stats,
      ts: item.ts,
    };
    console.log("statsItem: ", statsItem);
    statResults.push(statsItem);
  });

  return statResults;
};

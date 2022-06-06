/*! Copyright Sergei Akopov (thecloud21.com). All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

const AWS = require("aws-sdk");

AWS.config.region = process.env.AWS_REGION;
const documentClient = new AWS.DynamoDB.DocumentClient();

// Main Lambda handler
exports.handler = async (event) => {
  console.log(JSON.stringify(event, null, 2));

  const params = {
    TableName: process.env.DDB_TABLE,
    IndexName: "LSI_PK_Index_Keys_Only",
    FilterExpression: "begins_with(SK, :sk)",
    ExpressionAttributeValues: { ":sk": "completedstats" },
    ScanIndexForward: true,
    Limit: 200,
  };

  console.log(params);
  const result = await documentClient.scan(params).promise();
  console.log("result: ", result);

  let completedProcesses = [];
  result.Items.map((item) => {
    const statsItem = {
      processId: item.PK,
    };
    console.log("statsItem: ", statsItem);
    completedProcesses.push(statsItem);
  });

  return completedProcesses;
};

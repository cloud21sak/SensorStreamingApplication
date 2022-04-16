/*! Copyright Sergei Akopov (thecloud21.com). All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

const AWS = require("aws-sdk");

AWS.config.region = process.env.AWS_REGION;
const documentClient = new AWS.DynamoDB.DocumentClient();

// Main Lambda handler
exports.handler = async (event) => {
  console.log(JSON.stringify(event, null, 2));
  // const facilityId = parseInt(event.queryStringParameters.facilityId);
  const processId = event.queryStringParameters.processId;

  const params = {
    TableName: process.env.DDB_TABLE,
    // IndexName: "GSI_Index",
    IndexName: "LSI_PK_Index",
    // KeyConditionExpression: "GSI = :gsi and begins_with(SK, :sk)",
    KeyConditionExpression: "PK = :ID and begins_with(SK, :sk)",

    //ExpressionAttributeValues: { ":gsi": facilityId, ":sk": "dailystats" },
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


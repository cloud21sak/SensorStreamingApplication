/*! Copyright Sergei Akopov (thecloud21.com). All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

const AWS = require("aws-sdk");

AWS.config.region = process.env.AWS_REGION;

// Main Lambda handler
exports.handler = async (event) => {
  console.log(JSON.stringify(event, null, 2));

  const documentClient = new AWS.DynamoDB.DocumentClient();
  const facilityId = parseInt(event.queryStringParameters.facilityId);

  const params = {
    TableName: process.env.DDB_TABLE,
    IndexName: "GSI_Index",
    KeyConditionExpression: "GSI = :gsi and begins_with(SK, :sk)",
    ExpressionAttributeValues: { ":gsi": facilityId, ":sk": "facilityconfig" },
    ScanIndexForward: true,
    Limit: 10,
  };

  console.log(params);
  const result = await documentClient.query(params).promise();
  console.log("result: ", result);

  let results = [];
  result.Items.map((item) => {
    const facilityConfig = {
      facilityId: item.GSI,
      sensortypes: item.FacilityConfig,
    };
    console.log("facility config: ", facilityConfig);
    results.push(facilityConfig);
  });

  return results;
};

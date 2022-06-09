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
  const sensorConfigObj = JSON.parse(event.body).payload.sensortypes;
  console.log("sensorConfigObj: ", sensorConfigObj);

  // Stringify, and store as an attribute value
  // facility sensor configuration:
  const response = await documentClient
    .put({
      TableName: process.env.DDB_TABLE,
      Item: {
        PK: `facility-${facilityId}`,
        SK: `facilityconfig`,
        GSI: facilityId,
        FacilityConfig: JSON.stringify(sensorConfigObj),
      },
    })
    .promise();

  console.log("setFacilitySensorConfig() done");
};

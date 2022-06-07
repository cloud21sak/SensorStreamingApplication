/*! Copyright Sergei Akopov (thecloud21.com). All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

const AWS = require("aws-sdk");

// Mock environment variables
process.env.AWS_REGION = "us-east-1";
AWS.config.region = process.env.AWS_REGION;
process.env.localTest = true;

// Test DynamoDb table info:
process.env.DDB_TABLE = "sensordata-table";
let ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });

// Uncomment the line below to run as a standalone program
//const main = async () => {
async function deleteResourcesForTest() {
  // Delete the test DynamoDB table
  try {
    let params = {
      TableName: process.env.DDB_TABLE,
    };

    const result = await ddb.deleteTable(params).promise();
    console.log("deleteTable result: ", result);
  } catch (err) {
    console.log("Delete table error: ", err);
  }

  console.log("Test resources have been deleted!");
}

module.exports = { deleteResourcesForTest };
// Uncomment the line below to run as a standalone program
//main().catch((error) => console.error(error));

/*! Copyright Sergei Akopov (thecloud21.com). All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

const AWS = require("aws-sdk");

// Mock environment variables
process.env.AWS_REGION = "us-east-1";
AWS.config.region = process.env.AWS_REGION;
process.env.DDB_TABLE = "sensordata-table";
process.env.localTest = true;

const testResourcesData = require("./testResources.json");

// DynamoDb table info:
var ddbParams = testResourcesData.ddbParams;
ddbParams.TableName = process.env.DDB_TABLE;
let ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });

async function createTestDynamoDBtable() {
  console.log(`Initializing test DynamoDB table: ${process.env.DDB_TABLE}`);

  let params = {
    TableName: process.env.DDB_TABLE,
  };

  // Check if test DynamoDB table exists
  try {
    const result = await ddb.describeTable(params).promise();
    console.log("DDB describeTable() result: ", result);
  } catch (err) {
    // Create test DDB table:
    let result = await ddb.createTable(ddbParams).promise();
    console.log("createTable result: ", result);

    // Wait until TableStatus is "ACTIVE":
    do {
      await sleep(4000);
      console.log("Trying table");
      result = await ddb.describeTable(params).promise();
    } while (result.Table.TableStatus !== "ACTIVE");
  }

  console.log(`Test dynamoDB table: ${process.env.DDB_TABLE} created!`);
}

function sleep(millisec) {
  return new Promise((resolve) => setTimeout(resolve, millisec));
}

module.exports = { createTestDynamoDBtable };

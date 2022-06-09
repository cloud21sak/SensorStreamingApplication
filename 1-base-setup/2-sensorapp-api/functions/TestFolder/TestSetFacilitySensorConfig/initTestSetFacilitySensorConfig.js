/*! Copyright Sergei Akopov (thecloud21.com). All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

const AWS = require("aws-sdk");

const testResourcesData = require("../testResources.json");
const { createTestDynamoDBtable } = require("../generateTestResources.js");

async function initTestSetFacilitySensorConfig() {
  console.log(
    "Initializing test resources for testing setFacilitySensorConfig()"
  );

  await createTestDynamoDBtable();
 
  console.log("Test resources have been created!");
}

module.exports = { initTestSetFacilitySensorConfig };

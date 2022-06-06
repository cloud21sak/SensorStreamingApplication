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
let documentClient = undefined;

const main = async () => {
  console.log(
    `Initializing test resources: DynamoDB table: ${process.env.DDB_TABLE}`
  );

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
    do {
      await sleep(4000);
      console.log("Trying table");
      result = await ddb.describeTable(params).promise();
    } while (result.Table.TableStatus !== "ACTIVE");
  }

  documentClient = new AWS.DynamoDB.DocumentClient();
  // Initialize test data for completed process stats:
  for (
    let i = 0;
    i < testResourcesData.completedProcessTestDataList.length;
    i++
  ) {
    await generateCompletedProcessData(
      testResourcesData.completedProcessTestDataList[i]
    );
  }

  console.log("Test resources have been created!");
};

const generateCompletedProcessData = async (testData) => {
  let completedProcessData = {};
  completedProcessData.processSensorStats = {};
  completedProcessData.facilityId =
    testData.completedProcessTestData.facilityId;
  completedProcessData.processId = testData.completedProcessTestData.processId;

  testData.completedProcessTestData.processSensorStats.forEach(
    (procSensorStats) => {
      let sensorId = procSensorStats.sensorId;

      if (!(sensorId in completedProcessData.processSensorStats)) {
        completedProcessData.processSensorStats[`${sensorId}`] = {};
      }

      completedProcessData.processSensorStats[`${sensorId}`].min_val =
        procSensorStats.sensorStats.min_val;
      completedProcessData.processSensorStats[`${sensorId}`].max_val =
        procSensorStats.sensorStats.max_val;
      completedProcessData.processSensorStats[`${sensorId}`].median_val =
        procSensorStats.sensorStats.median_val;
      completedProcessData.processSensorStats[`${sensorId}`].name =
        procSensorStats.sensorStats.name;

      console.log(
        "completedProcessData.processSensorStats[sensorId]:",
        sensorId,
        completedProcessData.processSensorStats[sensorId]
      );
    }
  );

  await saveProcessSensorStats(completedProcessData);
};

const saveProcessSensorStats = async (completedProcessData) => {
  try {
    const sensorStatsData = JSON.stringify(
      completedProcessData.processSensorStats
    );
    const response = await documentClient
      .put({
        TableName: process.env.DDB_TABLE,
        Item: {
          PK: `proc-${completedProcessData.processId}`,
          SK: `completedstats`,
          GSI: completedProcessData.facilityId,
          stats: sensorStatsData,
          ts: Date.now(),
        },
      })
      .promise();
  } catch (err) {
    console.log("documentClient.put() error: ", err);
  }

  console.log("saveProcessSensorStats done");
};

function sleep(millisec) {
  return new Promise((resolve) => setTimeout(resolve, millisec));
}

//module.exports = { initResourcesForTest };
main().catch((error) => console.error(error));

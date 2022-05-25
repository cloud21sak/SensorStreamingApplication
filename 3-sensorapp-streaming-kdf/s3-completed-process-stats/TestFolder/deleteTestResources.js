const AWS = require("aws-sdk");

// Mock environment variables
process.env.AWS_REGION = "us-east-1";
AWS.config.region = process.env.AWS_REGION;
process.env.localTest = true;

const s3 = new AWS.S3();
// S3 test bucket info
const testBucketName = "sensordata-history-bucket-sak";
const testBucketKey = "facility-1/process-1653001170323";

// Test DynamoDb table info:
process.env.DDB_TABLE = "sensordata-table";
let ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });

// Uncomment the line below to run as a standalone program
//const main = async () => {
async function deleteResourcesForTest() {
  // Delete test data in S3 bucket:
  var deleteParams = { Bucket: testBucketName, Key: testBucketKey };
  try {
    const result = await s3.deleteObject(deleteParams).promise();
    console.log("deleteObject result: ", result);
  } catch (err) {
    console.log("Delete object error:", err);
  }

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

  // Call S3 to delete the bucket
  console.log("Test resources have been deleted!");
}

module.exports = { deleteResourcesForTest };
// Uncomment the line below to run as a standalone program
//main().catch((error) => console.error(error));

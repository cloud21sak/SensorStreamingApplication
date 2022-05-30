const AWS = require("aws-sdk");
const event = require("./testEvent.json");

// Mock environment variables
process.env.AWS_REGION = "us-east-1";
AWS.config.region = process.env.AWS_REGION;
process.env.localTest = true;

const s3 = new AWS.S3();
// S3 test bucket info
const testBucketName = "sensordata-runtimeprocess-bucket";
const testBucketKey = "facility-1/process-1653480073085";

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

  // Call S3 to delete the bucket
  console.log("Test resources have been deleted!");
}

module.exports = { deleteResourcesForTest };
// Uncomment the line below to run as a standalone program
//main().catch((error) => console.error(error));

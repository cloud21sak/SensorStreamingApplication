const AWS = require("aws-sdk");
const event = require("./testEvent.json");

// Mock environment variables
process.env.AWS_REGION = "us-east-1";
AWS.config.region = process.env.AWS_REGION;
process.env.localTest = true;

const s3 = new AWS.S3();

// S3 test bucket info
const runtimeBucketName = "sensordata-runtimeprocess-bucket";
const historyBucketName = "sensordata-history-bucket-sak";
process.env.RuntimeProcessBucket = runtimeBucketName;
process.env.HistoryBucket = historyBucketName;

// Note that the process ID comes from testData file here
const runtimeBucketKey = "facility-1/process-1654083155416";
const historyBucketKey = runtimeBucketKey;

const firehoseBucketName = event.Records[0].s3.bucket.name;
const firehoseBucketKey = event.Records[0].s3.object.key;

// Uncomment the line below to run as a standalone program
//const main = async () => {
async function deleteResourcesForTest() {
  // Delete test data in runtime-process S3 bucket:
  var deleteRuntimeBucketParams = {
    Bucket: runtimeBucketName,
    Key: runtimeBucketKey,
  };
  try {
    const result = await s3.deleteObject(deleteRuntimeBucketParams).promise();
    console.log("delete runtime-bucket object result: ", result);
  } catch (err) {
    console.log("Delete runtime-bucket object error:", err);
  }

  // Delete runtime-process test bucket:
  try {
    let deleteParams = { Bucket: runtimeBucketName };
    const result = await s3.deleteBucket(deleteParams).promise();
    console.log("delete runtime-bucket result: ", result);
  } catch (err) {
    console.log("Delete runtime-bucket error:", err);
  }

  // Delete test data in history S3 bucket:
  var deleteHistoryBucketParams = {
    Bucket: historyBucketName,
    Key: historyBucketKey,
  };
  try {
    const result = await s3.deleteObject(deleteHistoryBucketParams).promise();
    console.log("delete history bucket object result: ", result);
  } catch (err) {
    console.log("Delete history bucket object error:", err);
  }

  // Delete history S3 bucket:
  try {
    let deleteParams = { Bucket: historyBucketName };
    const result = await s3.deleteBucket(deleteParams).promise();
    console.log("delete history bucket result: ", result);
  } catch (err) {
    console.log("Delete history bucket error:", err);
  }

  // Delete firehose test object and bucket:
  var deleteFirehoseBucketParams = {
    Bucket: firehoseBucketName,
    Key: firehoseBucketKey,
  };
  try {
    const result = await s3.deleteObject(deleteFirehoseBucketParams).promise();
    console.log("delete firehose bucket object result: ", result);
  } catch (err) {
    console.log("Delete runtime-bucket object error:", err);
  }

  try {
    let deleteParams = { Bucket: firehoseBucketName };
    const result = await s3.deleteBucket(deleteParams).promise();
    console.log("delete firehose bucket result: ", result);
  } catch (err) {
    console.log("Delete firehose bucket error:", err);
  }

  console.log("Test resources have been deleted!");
}

module.exports = { deleteResourcesForTest };
// Uncomment the line below to run as a standalone program
//main().catch((error) => console.error(error));

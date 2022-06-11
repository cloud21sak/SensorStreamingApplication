/*! Copyright Sergei Akopov (thecloud21.com). All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

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
const firehoseBucketName = event.Records[0].s3.bucket.name;
const firehoseBucketKey = event.Records[0].s3.object.key;
const testDataFile = "/testData.txt";

//const main = async () => {
async function initResourcesForTest() {
  console.log(
    `Initializing test resources: Firehose S3 bucket: ${firehoseBucketName}, runtime S3 bucket: ${runtimeBucketName}, history S3 bucket: ${historyBucketName}`
  );

  // Create the parameters for calling createBucket
  var firehoseBucketParams = {
    Bucket: firehoseBucketName,
  };

  // Check if test bucket exists
  try {
    const data = await s3.headBucket(firehoseBucketParams).promise();
    console.log("firehoseBucket headBucket data: ", data);
  } catch (err) {
    let result = await s3.createBucket(firehoseBucketParams).promise();
    console.log("firehoseBucket createBucket result: ", result);

    // Check to make sure the bucket has been created
    do {
      await sleep(4000);
      console.log(`Trying bucket: ${firehoseBucketParams.Bucket}`);
      result = await s3.headBucket(firehoseBucketParams).promise();
    } while (result.$response.httpResponse.statusCode !== 200);
  }

  // Upload test data to firehose S3 bucket:
  // Configure the file stream and obtain the upload parameters
  var fs = require("fs");
  var path = require("path");

  console.log("process arguments:", process.argv);

  var testFilePath = path.join(__dirname, testDataFile);
  console.log("testFilePath: ", testFilePath);

  var fileStream = fs.createReadStream(testFilePath);
  fileStream.on("error", function (err) {
    console.log("File Error", err);
  });

  var uploadParams = { Bucket: "", Key: "", Body: "" };
  uploadParams.Bucket = firehoseBucketName;
  uploadParams.Key = firehoseBucketKey;
  uploadParams.Body = fileStream;

  try {
    const result = await s3.upload(uploadParams).promise();
    console.log("s3 upload result: ", result);
  } catch (err) {
    console.log("s3 upload error: ", err);
  }

  // Check if runtime process bucket exists:
  // Create the parameters for calling runtime process bucket:
  var runtimeBucketParams = {
    Bucket: runtimeBucketName,
  };

  try {
    const data = await s3.headBucket(runtimeBucketParams).promise();
    console.log("runtimeBucket headBucket data: ", data);
  } catch (err) {
    let result = await s3.createBucket(runtimeBucketParams).promise();
    console.log("runtime createBucket result: ", result);

    // Check to make sure the bucket has been created
    do {
      await sleep(4000);
      console.log(`Trying bucket: ${runtimeBucketParams.Bucket}`);
      result = await s3.headBucket(runtimeBucketParams).promise();
    } while (result.$response.httpResponse.statusCode !== 200);
  }

  // Check if history bucket exists:
  // Create the parameters for calling history bucket:
  var historyBucketParams = {
    Bucket: historyBucketName,
  };

  try {
    const data = await s3.headBucket(historyBucketParams).promise();
    console.log("history bucket headBucket data: ", data);
  } catch (err) {
    let result = await s3.createBucket(historyBucketParams).promise();
    console.log("history bucket createBucket result: ", result);

    // Check to make sure the bucket has been created
    do {
      await sleep(4000);
      console.log(`Trying bucket: ${historyBucketParams.Bucket}`);
      result = await s3.headBucket(historyBucketParams).promise();
    } while (result.$response.httpResponse.statusCode !== 200);
  }

  console.log("Test resources have been created!");
}

function sleep(millisec) {
  return new Promise((resolve) => setTimeout(resolve, millisec));
}

module.exports = { initResourcesForTest };
//main().catch((error) => console.error(error));

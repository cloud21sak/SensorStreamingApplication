const AWS = require("aws-sdk");
AWS.config.region = process.env.AWS_REGION;
const s3 = new AWS.S3();

// Mock environment variables
process.env.AWS_REGION = "us-east-1";
process.env.IOT_DATA_ENDPOINT =
  "a1dqbiklucuqp5-ats.iot.us-east-1.amazonaws.com";
process.env.TOPIC = "process-dailystats";
process.env.localTest = true;

// S3 test bucket info
const testBucketName = "sensordata-history-bucket-sak";
const testBucketKey = "facility-1/process-1653001170323";
const testDataFile = "/testData.json";

// Test DynamoDb table info:
process.env.DDB_TABLE = "sensordata-table";
var ddbParams = {};
let ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });

const main = async () => {
  //async function initResourcesForTest() {
  console.log(
    `Initializing test resources: S3 bucket: ${testBucketName}, DynamoDB table: ${process.env.DDB_TABLE}`
  );

  // Create test DDB table:
  ddbParams = {
    AttributeDefinitions: [
      {
        AttributeName: "GSI",
        AttributeType: "N",
      },
      {
        AttributeName: "PK",
        AttributeType: "S",
      },
      {
        AttributeName: "SK",
        AttributeType: "S",
      },
    ],
    KeySchema: [
      {
        AttributeName: "PK",
        KeyType: "HASH",
      },
      {
        AttributeName: "SK",
        KeyType: "RANGE",
      },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "GSI_Index",
        KeySchema: [
          { AttributeName: "GSI", KeyType: "HASH" },
          { AttributeName: "SK", KeyType: "RANGE" },
        ],
        Projection: {
          ProjectionType: "ALL",
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 10,
          WriteCapacityUnits: 10,
        },
      },
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 20,
      WriteCapacityUnits: 20,
    },
    TableName: process.env.DDB_TABLE,
    StreamSpecification: {
      StreamEnabled: false,
    },
  };

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
  }

  // Create the parameters for calling createBucket
  var bucketParams = {
    Bucket: testBucketName,
  };

  // Check if test bucket exists
  try {
    const data = await s3.headBucket(bucketParams).promise();
    console.log("headBucket data: ", data);
  } catch (err) {
    const result = await s3.createBucket(bucketParams).promise();
    console.log("createBucket result: ", result);
  }

  // Upload test data to S3 bucket:
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
  uploadParams.Bucket = testBucketName;
  uploadParams.Key = testBucketKey;
  uploadParams.Body = fileStream;

  try {
    const result = await s3.upload(uploadParams).promise();
    console.log("s3 upload result: ", result);
  } catch (err) {
    console.log("s3 upload error: ", err);
  }
  console.log("Test resources have been created!")
};

//module.exports = { initResourcesForTest };
main().catch((error) => console.error(error));

# Building serverless application with streaming sensor data

This example application shows how to build flexible serverless backends for streaming sensor data workloads.

The software simulates a manufacturing facility with a backend application that processes data from remote sensors for some batch processes.
The frontend allows users to view real-time or near real-time sensor data from a production facility.

To learn more about how this application works, see the 6-part series on the https://thecloud21.com:

- Part 1:
- Part 2:
- Part 3:
- Part 4:
- Part 5:
- Part 6:

NOTE!!!: Running this application will incur costs. It uses applications not in the AWS Free Tier and generates large number of messages.

## Requirements

- An AWS account. ([Create an AWS account](https://portal.aws.amazon.com/gp/aws/developer/registration/index.html) if you do not already have one and login.)
- AWS CLI already configured with Administrator permission
- [AWS SAM CLI installed](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html) - **minimum version 0.48**.
- [NodeJS 14.x installed](https://nodejs.org/en/download/)
- [Vue.js and Vue CLI installed](https://vuejs.org/v2/guide/installation.html)

## Installation Instructions

1. Clone the repository onto your local development machine:

```
git clone https://github.com/cloud21sak/SensorStreamingApplication
```

### 1. Set up core template and DynamoDB table

1. From the command line, install the realtime IoT messaging stack, Kinesis Data Streams stack, and DynamoDB table:

```
cd ./1-base-setup/1-iot-kinesis-ddb
sam deploy --guided
```

During the prompts, enter `sensor-app-base` for the stack name, enter your preferred Region, and accept the defaults for the remaining questions. Note the DynamoDB stream ARN output.

### 2. Set up APIs

1. Change directory to the 2-sensorapp-api folder:

```
cd ../2-sensorapp-api
```

2. In the AWS Management Console, go to the Cognito User Pools console, and select the SensorDataUserPool.
3. Copy the user pool ID and user pool client ID as shown:

   ![SensorDataUserPool ID: ](/setupdocs/imgs/SensorDataUserPoolIdHighlighted.PNG "SensorDataUserPool ID example")

   ![SensorDataUserPoolClient ID: ](/setupdocs/imgs/SensorDataUserPoolClientIdHighlighted.PNG "SensorDataUserPoolClient ID example")

4. In the samconfig.toml file in the 2-sensorapp-api folder, replace values for UserPoolId and ApplClientId with your SensorDataUserPool ID and SensorDataUserPoolClient ID respectively:

```
parameter_overrides = "DynamoDBSensortableName=\"sensordata-table\" UserPoolId=\"your user pool ID here\" ApplClientId=\"your user pool client ID here\""
```

5. From the command line, install the application's API functionaliy using the AWS SAM template:

```
sam deploy --guided
```

During the prompts, enter `sensorapp-streaming-api` for the stack name, enter your preferred Region. Accept the defaults for the remaining questions.
Answer Y if you are prompted `Deploy this changeset? [y/N]:`
Note the API Gateway endpoint output.

### 3. Set up streaming examples

1. Change directory to install Lambda functions that process data from Kinesis Data Streams:

```
cd ../../2-sensorapp-streaming-kds
```

3. Retrieve the IoT endpoint address. You can do this by:
   - executing the CLI command:

```
aws iot describe-endpoint --endpoint-type iot:Data-ATS
```

- or getting it from the AWS IoT console:
  ![AWS IoT endpoint address: ](/setupdocs/imgs/AwsIoTEndpoint.PNG "AWS IoT device data endpoint of your account")

4. In the samconfig.toml file, set the value of IoTdataEndpoint similar to this:

```
IoTdataEndpoint=\"a1dqbiklucuqp5-ats.iot.us-east-1.amazonaws.com\""
```

5. Deploy the AWS SAM template in the directory:

```
sam deploy --guided
```

During the prompts, enter a stack name, your preferred Region, and accept the defaults for the remaining questions.

6. Change directory, for each use case, and deploy the AWS SAM template in the directory:

#### a)

```
cd ./2-sensorapp-streaming-kds    <--- Sensor App using Kinesis Streams (see part 2 of the blog series)
```

```
sam deploy --guided
```

During the prompts, enter a stack name, your preferred Region, and accept the defaults for the remaining questions.

#### b)

```
cd ../3-sensorapp-streaming-kdf   <--- Sensor App using Kinesis Firehose (see part 3 of the blog series)
```

```
sam deploy --guided
```

#### c)

```
cd ../4-sensorapp-streaming-kda  <---  Sensor App using Kinesis Data Analytics (see part 4 of the blog series)
```

```
sam deploy --guided
```

After deployment, navigate to the Kinesis Data Analytics console and start the application.

3. Retrieve the IoT endpointAddress - note this for the AdminAppFrontend installation:

```
aws iot describe-endpoint --endpoint-type iot:Data-ATS
```

4. Retrieve the Cognito Pool ID - note this for the AdminAppFrontend installation:

```
aws cognito-identity list-identity-pools --max-results 10
```

### 5. Installing the AdminAppFrontend application

The frontend code is saved in the `AdminAppFrontend` subdirectory.

1. Before running, you need to set environment variables in the `src\configurations\appconfig.json` file:

- APIendpoint: this is the `APIendpoint` value earlier.
- PoolId: your Cognito pool ID from earlier.
- Host: your IoT endpoint from earlier.
- Region: your preferred AWS Region (e.g. us-east-1).

2. Change directory into the AdminAppFrontend code directory, and run the NPM installation:

```
cd ../AdminAppFrontend
npm install

3. After installation is complete, you can run the application locally:
```

npm run serve

```

4. Change directory into the OperatorAppFrontend code directory, and run the NPM installation:

cd ../OperatorAppFrontend
npm install
```

5. After installation is complete, you can run the application locally:

```
npm run serve
```

## Setting up the client app in CloudFront:

1. From terminal prompt, go to OperatorAppFrontend folder. Run npm run build. When the build is finished, you should see "dist" subfolder under OperatorAppFrontend folder.
2. Create an S3 bucket (note that the name must be globally unique. For example: sensor-app-client-sak21. Enable public access.
3. Go to the Properties page, and enable "Static website hosting" property. Enter index.html for Index document and Error document entries.
4. Go to the Permissions page, and under the "Bucket policy" enter the following policy:

{
"Version": "2012-10-17",
"Statement": [
{
"Sid": "PublicReadGetObject",
"Effect": "Allow",
"Principal": "_",
"Action": [
"s3:GetObject"
],
"Resource": [
"arn:aws:s3:::[your bucket name]/_" # (for example: "Resource": "arn:aws:s3:::sensor-app-client-sak21/\*")
]
}
]
}

5. Next, upload files and folders under the dist folder:
   a) Go to the Objects tab of your bucket and select Upload.
   b) Select "Add files" button, and select index.html and favicon.ico
   c) Next, click "Add folder" button, and select "css" folder, then click Upload
   d) do the same for "img" and "js" folders
   e) On the Upload page for your bucket click the "Upload" button at the bottom of the page.
6. Your bucket now has the same structure as your local "dist" subforlder.
7. In Management Console, go to the CloudFront service console
8. Select Create Distribution
9. In Origin Domain dropdown, select the bucket URL where the files from the dist folder were uploaded.
10. In Name field, enter name for the origin, for example: sensor-app-operator
11. Under 'Viewer', for 'Viewer protocol policy', select 'Redirect HTTP to HTTPS'
12. Under 'Settings' for 'Default root object' enter index.html
13. Select "Create Distribution".
14. Go to Distributions page, and wait until the "Last modified" status is set to 'Deployed'
15. Copy the domain name of the new distribution and paste it on a new tab in your browser.

## Cleanup

1. Manually delete any objects in the application's S3 buckets.
2. Use the CloudFormation console to delete all the stacks deployed.

## Clearing the DynamoDB table

SPDX-License-Identifier: MIT-0

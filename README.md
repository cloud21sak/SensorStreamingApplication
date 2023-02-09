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

### 3. Set up streaming functionality

1. Change directory to install Lambda functions that process data from Kinesis Data Streams:

```
cd ../../2-sensorapp-streaming-kds
```

3. Retrieve the IoT endpoint address. You can do this:

- by executing the CLI command:

```
aws iot describe-endpoint --endpoint-type iot:Data-ATS
```

- or by getting it from the AWS IoT console:

  ![AWS IoT endpoint address: ](/setupdocs/imgs/AwsIoTEndpoint.PNG "AWS IoT device data endpoint of your account")

4. In the samconfig.toml file, set the value of IoTdataEndpoint similar to this:

```
IoTdataEndpoint=\"a1dqbiklucuqp5-ats.iot.us-east-1.amazonaws.com\""
```

5. Deploy the AWS SAM template in the directory:

```
sam deploy --guided
```

During the prompts, enter a stack name, your preferred Region, and accept the defaults for the remaining questions. Answer Y if you are prompted `Deploy this changeset? [y/N]:`

6. Change directory to the 3-sensorapp-streaming-kdf folder:

```
cd ../3-sensorapp-streaming-kdf
```

7. In the samconfig.toml file, set parameter values:

   - DeliveryBucketName: provide unique name for your delivery bucket.
   - RuntimeProcessBucketName: provide unique name for your runtime bucket.
   - HistoryBucketName: provide unique name for your history bucket.
   - IoTdataEndpoint: this is the IoT endpoint from earlier.
   - DynamoDBSensorstreamARN: this is the DynamoDB stream ARN from earlier (sensor-app-base stack).

8. Deploy the AWS SAM template in the directory:

```
sam deploy --guided
```

During the prompts, enter a stack name, your preferred Region, and accept the defaults for the remaining questions. Answer Y if you are prompted `Deploy this changeset? [y/N]:`

9. Retrieve the Cognito Identity Pool ID for SensorDataIdentityPool - note this for the frontend installation:

```
aws cognito-identity list-identity-pools --max-results 10
```

10. Create the AWS IoT policy to allow clients to connect to IoT Core service:

- go to the AWS IoT Management Console -> Security -> Policies
- create new policy, name it SensorDataPolicy:

  ![AWS IoT policy: ](/setupdocs/imgs/SensorDataPolicy.PNG "AWS IoT SensorDataPolicy")

- enter the following policy:

```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "iot:Connect",
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "iot:Publish",
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "iot:Receive",
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "iot:Subscribe",
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "iot:GetThingShadow",
      "Resource": "*"
    }
  ]
}
```

For more details on how security works in ACME Industries application, see Part 6 of the series.

### 4. Adding user accounts to Cognito user pool

1. Go to Cognito User Pools console and select SensorDataUserPool.
2. In the left panel, under 'General settings', select 'Users and groups':

   ![Cognito users and groups: ](/setupdocs/imgs/CognitoUserPoolsUsersAndGroups.PNG "Cognito users and groups")

3. Click on the 'Create user' button to bring up the 'Create user' form:

   ![Cognito create user: ](/setupdocs/imgs/CognitoCreateUserDialog.PNG "Cognito create user dialog")

4. Enter a user name, valid temporary password, and an email address similar to what is shown. To keep things simple, uncheck the 'Send an invitation to this new user?' and 'Mark phone number as verified' checkboxes:

   ![Cognito create user: ](/setupdocs/imgs/CognitoCreateUserDialogWithUserInfo.PNG "Cognito create user dialog with user info")

5. Click on the 'Create user' button at the bottom of the form. The user has been added to the Users directory of SensorDataUserPool.
6. You might want to add at least one more user to the user pool in order to run the frontends with two different users.

### 4. Installing the AdminAppFrontend application

The frontend code is saved in the `AdminAppFrontend` subdirectory.

1. Open a new terminal window (I used VS Code)
2. Change directory into the AdminAppFrontend code directory:

```
cd AdminAppFrontend

```

3. Before running, you need to set environment variables in the `src\configurations\appconfig.json` file:

   - userPoolId: your Cognito SensorDataUserPool ID from earlier.
   - appClientId: your Cognito SensorDataUserPoolClient ID from earlier.
   - identityPoolId: your Cognito SensorDataIdentityPool ID from earlier.
   - iotHost: your IoT endpoint from earlier.
   - region: your preferred AWS Region (e.g. us-east-1).
   - APIendpoint: this is the API Gateway endpoint output value from sensorapp-streaming-api stack earlier.

4. Run the NPM installation if this is the first time you are setting up the app on your PC:

```
npm install
```

5. After installation is complete, you can run the application locally:

```
npm run serve

```

### 5. Installing the OperatorAppFrontend application locally

The OperatorAppFrontend code is saved in the `OperatorAppFrontend` subdirectory.

1. Open another terminal window (I used VS Code).
2. Change directory into the `OperatorAppFrontend` code directory:

```
cd OperatorAppFrontend
```

3. Overwrite contents in `src\configurations\appconfig.json` file with the configuration setup in the appconfig.json file from `AdminAppFrontend`subdirectory.

4. Run the NPM installation if this is the first time you are setting up the app on your PC:

```
npm install

```

5. After installation is complete, you can run the application locally:

```
npm run serve

```

### 6. Running frontend applications

1. Assuming you have the AdminAppFrontend already running on your localhost, click on the 'LOGIN' button on the welcome page which will take you to the login page.Enter the user name and temporary password for the user you have created:

   ![User login form: ](/setupdocs/imgs/Login.PNG "User login form for ACME Industries app")

2. Click on the 'LOGIN' button.
3. After submitting the login form, user will be prompted to enter a new password (note that here I just use a simple window prompt; in production, you would obviously need to implement a custom prompt to hide the password):

   ![User login password prompt: ](/setupdocs/imgs/LoginPrompt.PNG "User password prompt")

4. If the user login was successful, you will be redirected to the main dashboard.
5. Go to the Cognito Identity Pool console. Under Identity Browser tab you should see the autheticated user identity similar to this one:

   ![Cognito Identity pool: ](/setupdocs/imgs/CognitoIdenityPoolWithAuthUser.PNG "Authenticated user ID")

6. Copy the ID and paste it into the CLI command:

```
aws iot attach-policy --policy-name SensorDataPolicy --target your user ID here
```

7. You can check in the Console window of your browser if the connection was successful:

   ![MQTT client connected: ](/setupdocs/imgs/MqttClientConnected.PNG "MQTTClient connected")

8. You are now ready to start running the application.

For more details on how security works in ACME Industries application, see Part 6 of the series.

### 6. Setting up the OperatorAppFrontend app in CloudFront:

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

## Alternative stack to analyze streaming data: Kinesis Data Analytics

This stack shows how to create a Kinesis Data Anaytics consumer for the main Kinesis Data Stream as an alternative to using tumbling window Lambda function. To deploy this stack:

Change directory to the 4-sensorapp-streaming-kda folder:

```

cd ../4-sensorapp-streaming-kda <--- Sensor App using Kinesis Data Analytics (see part 4 of the blog series)

```

```

sam deploy --guided

```

After deployment, navigate to the Kinesis Data Analytics console and start the application.

## Cleanup

1. Manually delete any objects in the application's S3 buckets.
2. Use the CloudFormation console to delete all the stacks deployed.

## Clearing the DynamoDB table

SPDX-License-Identifier: MIT-0

```

```

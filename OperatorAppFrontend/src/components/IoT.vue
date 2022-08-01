<template>
  <div></div>
</template>

<script>
/* eslint-disable */

import { bus } from "../main";
const AWS = require("aws-sdk");
const AWSIoTData = require("aws-iot-device-sdk");

const topics = {
  facilitystatus: "facility-status",
  percentcompleteupdate: "percent-complete-update",
  currentProcessIdUpdate: "current-procid-update",
  facilityconfigrequest: "facility-config-request",
  facilityconfigupdate: "facility-config-update",
  sensorInstanceInfoRequest: "sensor-info-request",
  sensorInstanceInfoUpdate: "sensor-instance-update",
  facilitycommand: "facility-command",
  sensorsubscribe: "sensordata-subscribe",
  procdailystats: "process-dailystats",
  completedprocinfo: "completed-processinfo",
  latestminutestats: "latest-minutestats",
};

let mqttClient = null;
export default {
  name: "IoT",
  methods: {
    // TODO: refactor this code to use vuex
    async getCreds() {
      console.log("getCreds called");
      const cognitoIdentity = new AWS.CognitoIdentity();

      return new Promise((resolve, reject) => {
        AWS.config.credentials.get(function(err) {
          if (!err) {
            console.log(
              "Retrieved identity: " + AWS.config.credentials.identityId
            );
            const params = {
              IdentityId: AWS.config.credentials.identityId,
            };
            cognitoIdentity.getCredentialsForIdentity(params, function(
              err,
              data
            ) {
              console.log("Creds: ", data);
              if (!err) {
                resolve(data);
              } else {
                console.log("Error retrieving credentials: " + err);
                reject(err);
              }
            });
          } else {
            console.log("Error retrieving identity:" + err);
            reject(err);
          }
        });
      });
    },
  },
  created: async function() {
    console.log("IoT hook called: 'created'!");
  },
  mounted: async function() {
    //console.log("IoT Component, $appConfig: ", this.$appConfig);
    console.log(
      "IoT Component, this.$store.getters.appConfiguration: ",
      this.$store.getters.appConfiguration
    );

    const authcredentials = this.$store.getters.authCredentials;
    console.log("authcredentials: ", authcredentials);
    console.log(authcredentials.accessKeyId);
    console.log(authcredentials.secretAccessKey);
    console.log(authcredentials.sessionToken);
    console.log("IoT mounted");

    try {
      console.log("Creating mqttClient device");

      mqttClient = AWSIoTData.device({
        region: AWS.config.region,
        host: this.$store.getters.appConfiguration.iotHost, //can be queried using 'aws iot describe-endpoint --endpoint-type iot:Data-ATS'
        clientId: "sensordata-" + Math.floor(Math.random() * 100000 + 1),
        maximumReconnectTimeMs: 8000,
        debug: false,
        protocol: "wss",
        accessKeyId: authcredentials.accessKeyId,
        secretKey: authcredentials.secretAccessKey,
        sessionToken: authcredentials.sessionToken,
      });

      console.log("Created mqttClient device:", mqttClient);
    } catch (err) {
      console.log(err);
    }

    // We are connected, subscribe to the topics we are interested in.
    // Note that only operator/view nodes subscribe to facility status updates:
    mqttClient.on("connect", function() {
      console.log("mqttClient connected");

      mqttClient.subscribe(topics.sensorsubscribe);
      mqttClient.subscribe(topics.facilitystatus);
      mqttClient.subscribe(topics.facilityconfigupdate);
      mqttClient.subscribe(topics.sensorInstanceInfoUpdate);
      mqttClient.subscribe(topics.percentcompleteupdate);
      mqttClient.subscribe(topics.currentProcessIdUpdate);
      mqttClient.subscribe(topics.procdailystats);
      mqttClient.subscribe(topics.completedprocinfo);
      mqttClient.subscribe(topics.latestminutestats);

      const payload = {
        facilityId: 1,
      };
      // User just connected, request current facility configuration:
      mqttClient.publish(topics.facilityconfigrequest, JSON.stringify(payload));
      // Request list of facility sensor instances from the admin node:
      mqttClient.publish(
        topics.sensorInstanceInfoRequest,
        JSON.stringify(payload)
      );
    });

    // Attempt to reconnect in the event of any error
    mqttClient.on("error", async function(err) {
      console.log("mqttClient error:", err);

      // Update creds
      const data = await that.getCreds();
      mqttClient.updateWebSocketCredentials(
        data.Credentials.AccessKeyId,
        data.Credentials.SecretKey,
        data.Credentials.SessionToken
      );
    });

    // User issued command to sensor facility:
    bus.$on("facilitycommandissued", async (data) => {
      console.log("Commandpublish: ", data);
      mqttClient.publish(topics.facilitycommand, JSON.stringify(data));
    });

    // A message has arrived - parse to determine topic
    mqttClient.on("message", function(topic, payload) {
      const payloadEnvelope = JSON.parse(payload.toString());

      //console.log("IoT::onMessage: ", topic, payloadEnvelope);

      if (topic === topics.facilitystatus) {
        bus.$emit("facilitystatusupdated", payloadEnvelope);
      } else if (topic === topics.facilityconfigupdate) {
        console.log("IoT::facilityconfigupdate: ", topic, payloadEnvelope);
        bus.$emit("facilityconfigupdate", payloadEnvelope);
      } else if (topic === topics.sensorInstanceInfoUpdate) {
        console.log("IoT::sensorInstanceInfoUpdate: ", topic, payloadEnvelope);
        bus.$emit("sensorInstanceInfoUpdate", payloadEnvelope);
      } else if (topic === topics.percentcompleteupdate) {
        // console.log("IoT::percentcompleteupdate: ", topic, payloadEnvelope);
        bus.$emit("updatepercentcomplete", payloadEnvelope);
      } else if (topic === topics.currentProcessIdUpdate) {
        console.log("IoT::currentProcessIdUpdate: ", topic, payloadEnvelope);
        bus.$emit("updateCurrentProcessId", payloadEnvelope);
      } else if (topic === topics.procdailystats) {
        console.log("Received message for topic: ", topics.procdailystats);
        bus.$emit("procdailystats", payloadEnvelope);
      } else if (topic === topics.completedprocinfo) {
        console.log("Received message for topic: ", topics.completedprocinfo);
        bus.$emit("completedprocinfo", payloadEnvelope);
      } else if (topic === topics.latestminutestats) {
        console.log("Received message for topic: ", topics.latestminutestats);
        bus.$emit("latestminutestats", payloadEnvelope);
      } else {
        bus.$emit("message", payloadEnvelope);
      }
    });
  },
  async beforeDestroy() {
    console.log("IoT Component: beforeDestroy() hook called");

    mqttClient.unsubscribe(topics.sensorsubscribe);
    mqttClient.unsubscribe(topics.facilitystatus);
    mqttClient.unsubscribe(topics.facilityconfigupdate);
    mqttClient.unsubscribe(topics.sensorInstanceInfoUpdate);
    mqttClient.unsubscribe(topics.percentcompleteupdate);
    mqttClient.unsubscribe(topics.currentProcessIdUpdate);
    mqttClient.unsubscribe(topics.procdailystats);
    mqttClient.unsubscribe(topics.completedprocinfo);
    mqttClient.unsubscribe(topics.latestminutestats);

    // bus.$off("sensorpublish");
    bus.$off("facilitycommandissued");
    // bus.$off("sensorInstanceInfoRequest");
    // bus.$off("facilitystatusupdate");
    // bus.$off("facilityconfigpublish");
    // bus.$off("currentProcessIdPublish");
    // bus.$off("updatepercentcomplete");
  },
};
</script>

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
  facilitycommand: "facility-command",
  facilityconfigrequest: "facility-config-request",
  facilityconfigupdate: "facility-config-update",
  sensorpublish: "sensordata-publish",
  sensorsubscribe: "sensordata-subscribe",
  procdailystats: "process-dailystats",
  completedprocinfo: "completed-processinfo",
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
  mounted: async function() {
    console.log(
      "IoT Component, this.$store.getters.appConfiguration: ",
      this.$store.getters.appConfiguration
    );
    // const AWSConfiguration = this.$appConfig;
    const authcredentials = this.$store.getters.authCredentials;
    console.log("authcredentials: ", authcredentials);
    console.log(authcredentials.accessKeyId);
    console.log(authcredentials.secretAccessKey);
    console.log(authcredentials.sessionToken);
    console.log("IoT mounted");

    try {
      console.log("Creating mqttClient device");

      //var mqttClient = AWSIoTData.device({
      mqttClient = AWSIoTData.device({
        region: AWS.config.region,
        host: this.$store.getters.appConfiguration.iotHost, //can be queried using 'aws iot describe-endpoint --endpoint-type iot:Data-ATS' - doesn't work with just 'describe-endpoint'
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
    // Note that from the admin/simulator node, we don't subscribe to
    // facility status updates. Only operator/view nodes subscribe to status:
    mqttClient.on("connect", function() {
      console.log("mqttClient connected");

      mqttClient.subscribe(topics.facilitycommand);
      mqttClient.subscribe(topics.sensorsubscribe);
      mqttClient.subscribe(topics.facilityconfigrequest);
      mqttClient.subscribe(topics.procdailystats);
      mqttClient.subscribe(topics.completedprocinfo);
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

    // SAK???
    // Publish message to IoT Core topic
    bus.$on("sensorpublish", async (data) => {
      //  console.log("Sensorpublish: ", data);
      mqttClient.publish(topics.sensorpublish, JSON.stringify(data));
    });

    // User issued command to sensor facility:
    bus.$on("facilitycommandissued", async (data) => {
      console.log("Commandpublish: ", data);
      mqttClient.publish(topics.facilitycommand, JSON.stringify(data));
    });

    // run-time status of a facility changed:
    bus.$on("facilitystatusupdate", async (data) => {
      console.log("Facility status publish: ", data);
      mqttClient.publish(topics.facilitystatus, JSON.stringify(data));
    });

    // User requested facility configuration:
    bus.$on("facilityconfigpublish", async (data) => {
      console.log("Facility configuration publish: ", data);
      mqttClient.publish(topics.facilityconfigupdate, JSON.stringify(data));
    });

    bus.$on("updatepercentcomplete", async (data) => {
      mqttClient.publish(topics.percentcompleteupdate, JSON.stringify(data));
    });

    // A message has arrived, determine topic and notify subscribers:
    mqttClient.on("message", function(topic, payload) {
      const payloadEnvelope = JSON.parse(payload.toString());
      //  console.log("IoT::onMessage: ", topic, payloadEnvelope);
      if (topic === topics.facilitycommand) {
        bus.$emit("facilitycommandreceived", payloadEnvelope);
      } else if (topic === topics.facilityconfigrequest) {
        bus.$emit("facilityconfigrequest", payloadEnvelope);
      } else if (topic === topics.procdailystats) {
        console.log("Received message for topic: ", topics.procdailystats);
        bus.$emit("procdailystats", payloadEnvelope);
      } else if (topic === topics.completedprocinfo) {
        console.log("Received message for topic: ", topics.completedprocinfo);
        bus.$emit("completedprocinfo", payloadEnvelope);
      } else {
        bus.$emit("message", payloadEnvelope);
      }
    });
  },
  async beforeDestroy() {
    console.log("IoT Component: beforeDestroy() hook called");
    mqttClient.unsubscribe(topics.facilitycommand);
    mqttClient.unsubscribe(topics.sensorsubscribe);
    mqttClient.unsubscribe(topics.facilityconfigrequest);
    mqttClient.unsubscribe(topics.procdailystats);
    mqttClient.unsubscribe(topics.completedprocinfo);

    bus.$off("sensorpublish");
    bus.$off("facilitycommandissued");
    bus.$off("facilitystatusupdate");
    bus.$off("facilityconfigpublish");
    bus.$off("updatepercentcomplete");
    //mqttClient.off("message");
  },
};
</script>

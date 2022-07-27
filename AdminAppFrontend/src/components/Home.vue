<template>
  <v-container>
    <IoT />
    <v-row>
      <v-container fluid>
        <h1>Facility 1</h1>
        <v-row dense>
          <!-- Facility Dashboard -->
          <v-col cols="12" md="6">
            <v-card elevation="2">
              <v-card-actions>
                <!-- Facility control buttons  -->
                <v-btn
                  color="green"
                  v-if="facilitystatus.status === 'IDLE' && isLoggedIn"
                  elevation="2"
                  outlined
                  @click="onStart()"
                  >Launch Facility</v-btn
                >
                <v-btn
                  color="blue"
                  v-if="
                    (facilitystatus.status === 'STOPPED' ||
                      facilitystatus.status === 'COMPLETE') &&
                      isLoggedIn
                  "
                  elevation="2"
                  outlined
                  @click="onReset()"
                  >Reset Facility</v-btn
                >
                <v-btn
                  color="orange"
                  v-if="
                    facilitystatus.status === 'RUNNING' ||
                      facilitystatus.status === 'COMPLETING'
                  "
                  :disabled="facilitystatus.status === 'COMPLETING'"
                  elevation="2"
                  outlined
                  @click="onPause()"
                  >Pause Facility</v-btn
                >
                <v-btn
                  color="orange"
                  v-if="facilitystatus.status === 'PAUSED'"
                  elevation="2"
                  outlined
                  @click="onResume()"
                  >Resume Facility</v-btn
                >
                <v-btn
                  color="red"
                  v-if="
                    facilitystatus.status === 'RUNNING' ||
                      facilitystatus.status === 'PAUSED' ||
                      facilitystatus.status === 'COMPLETING'
                  "
                  :disabled="facilitystatus.status === 'COMPLETING'"
                  elevation="2"
                  outlined
                  @click="onStop()"
                  >Stop Facility</v-btn
                >
                <!-- <v-list-item align="left"> </v-list-item> -->
              </v-card-actions>
            </v-card>
          </v-col>
          <!-- Sensor data -->
          <v-col cols="12" md="4">
            <v-card v-if="facilitystatus.status !== 'IDLE'">
              <!-- <v-card-title>Current process ID:</v-card-title> -->
              <v-card-text class="display-2">
                <v-text-field
                  label="Current process ID:"
                  v-model="currentProcessId"
                  readonly
                ></v-text-field>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12" md="4">
            <v-card>
              <v-card-title>Status</v-card-title>
              <v-card-text class="display-2">
                <v-text-field
                  v-model="facilitystatus.status"
                  readonly
                ></v-text-field>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="4">
            <v-card>
              <v-card-title>Total runtime (min)</v-card-title>
              <v-card-text class="display-2">
                <v-text-field v-model="totalRuntime" readonly></v-text-field>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="4">
            <v-card>
              <v-card-title>%Complete</v-card-title>
              <v-card-text class="display-2">
                <v-text-field
                  v-model="currentPctComplete"
                  readonly
                ></v-text-field>
              </v-card-text>
              <!-- Progress bar showing % complete of facility runtime process-->
              <v-progress-linear
                color="blue"
                buffer-value="0"
                :value="currentPctComplete"
                stream
                v-show="
                  facilitystatus.status === 'RUNNING' ||
                    facilitystatus.status === 'PAUSED'
                "
              ></v-progress-linear>
              <v-spacer></v-spacer>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-row>
    <v-row>
      <!-- Realtime sensor data -->
      <v-col cols="12" md="5">
        <v-card elevation="2">
          <v-card-title>Realtime Data</v-card-title>
          <v-data-table
            :headers="realtimestatsheaders"
            height="400px"
            :items="realtimeSensorDisplay"
            :items-per-page="5"
            class="elevation-1"
            :multi-sort="true"
            select-row="0"
          >
          </v-data-table>
        </v-card>
      </v-col>
      <!-- Stats by latest minute -->
      <v-col cols="12" md="7">
        <v-card elevation="2">
          <v-card-title>Stats by latest minute </v-card-title>
          <v-data-table
            :headers="latestminutestatsheaders"
            height="400px"
            :items="latestMinuteSensorStatsDisplay"
            :items-per-page="5"
            class="elevation-1"
            :multi-sort="true"
            select-row="0"
          >
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>
    <v-row>
      <!-- Cumulative daily stats -->
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>Daily Stats</v-card-title>
          <v-data-table
            :headers="dailystatsheaders"
            height="400px"
            :items="dailyStatsDisplay"
            :items-per-page="5"
            class="elevation-1"
            :multi-sort="true"
            select-row="0"
          >
          </v-data-table>
        </v-card>
      </v-col>
      <!-- Completed process stats -->
      <v-col cols="12" md="6">
        <v-card elevation="2">
          <v-card-title>Completed Process Stats </v-card-title>
          <v-select
            class="ma-2"
            :items="completedProcesses"
            label="Select process"
            dense
            outlined
            v-model="selectedProcessId"
            @change="updatedProcessId"
          ></v-select>
          <v-data-table
            :headers="dailystatsheaders"
            height="300px"
            :items="completedProcessInfoDisplay.completedProcessStats"
            :items-per-page="5"
            class="elevation-1"
            :multi-sort="true"
            select-row="0"
          >
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import IoT from "./IoT.vue";
import { bus } from "../main";
import { v4 as uuidv4 } from "uuid";

import sensorconfig from "@/configurations/sensorconfig.json";

//import { gunzip } from "@/lib/gzip";
import axios from "axios";

// Libraries
const Sensor = require("@/lib/sensor");
import appStore from "../store";

// Globals
const FACILITY_RUN_SECONDS = 600;
const INTERVAL_SECONDS = 1;

const round = (value, decimals) => {
  return Number(Math.round(value + "e" + decimals) + "e-" + decimals);
};

const simulateSensorData = (min, max) => {
  return Math.random() * (max - min) + min;
};

export default {
  name: "Home",
  components: {
    IoT,
  },
  computed: {
    facilitystatus() {
      return this.$store.getters.facilityStatus;
    },
    isLoggedIn() {
      return this.$store.getters.isAuthenticated;
    },
    currentProcessId() {
      return this.$store.getters.getCurrentProcessId;
    },
    currentPctComplete() {
      return this.$store.getters.getPctComplete;
    },
    dailyStatsDisplay() {
      return this.$store.getters.dailySensorStats;
    },
    completedProcessInfoDisplay() {
      return this.$store.getters.completedProcessInfo;
    },
  },
  data() {
    return {
      dailystatsheaders: [
        { text: "Name", value: "name" },
        { text: "Min", value: "min" },
        { text: "Max", value: "max" },
        { text: "Median", value: "median" },
        { text: "Std-dev", value: "stddev" },
      ],
      latestminutestatsheaders: [
        { text: "Name", value: "name" },
        { text: "Min", value: "min" },
        { text: "Max", value: "max" },
        { text: "Std-dev", value: "stddev" },
        { text: "Timestamp", value: "ts" },
      ],
      realtimestatsheaders: [
        { text: "Name", value: "name" },
        { text: "Data", value: "sensordata" },
      ],

      pctComplete: 0,
      totalRuntime: FACILITY_RUN_SECONDS / 60,
      processId: 0,
      event: "",
      intervalVar: null,
      sensors: [],
      sensortypes: sensorconfig.sensortypes,
      sensorId: 0,
      issuedcommand: null,
      sensor: {},
      sensorsToPublish: [],
      realtimeSensorData: {},
      realtimeSensorDisplay: [],
      latestMinuteSensorStats: {},
      latestMinuteSensorStatsDisplay: [],
      dailySensorStats: {},
      sensorsForSelectedFacility: [],
      selectedProcessId: null,
      completedProcesses: [],
      statsForSelectedProcessId: [],
    };
  },
  beforeRouteEnter(to, from, next) {
    console.log("Store instance: ", appStore);

    if (!appStore.getters.isAuthenticated) {
      next("/login");
    } else {
      console.log("Home Component, user authenticated!");
      next(true);
    }
  },
  async created() {
    console.log("Home Component: created() hook called");
    console.log("event bus in created beginning:", bus);

    // Here we need to check whether sensor instances have been created.
    // This covers the case when sensor types have been updated in the Configure
    // component. If they were, then sensor instances have been already generated
    // in vuex store.
    if (this.$store.getters.sensorInstances.length === 0) {
      await this.initializeSensorTypesConfiguration();
    }

    const that = this;
    this.sensors = this.$store.getters.sensorInstances;

    // Set selected process from the vuex store:
    this.selectedProcessId = this.$store.getters.completedProcessInfo.selectedProcessId;

    // When messages are received via IOT, these handlers are triggered
    bus.$on("message", async (message) => {
      // console.log("Home::on::message: ", message);

      if (message.msg === "sensordata") {
        //console.log("Received sensor data message: ", message);
        await that.updateRealtimeSensorData(message.sensordata);
      }
    });

    bus.$on("facilitycommandreceived", async (receivedcommand) => {
      console.log("Home::on::facilitycommand: ", receivedcommand.command);
      await that.executeCommand(receivedcommand);
    });

    bus.$on("facilityconfigrequest", async (receivedconfigrequest) => {
      console.log("Home::on::facilityconfigrequest: ");
      await that.handleConfigurationRequest(receivedconfigrequest);
    });

    bus.$on("sensorInstanceInfoRequest", async (sensorInstanceInfoRequest) => {
      console.log("Home::on::sensorInstanceInfoRequest: ");
      await that.handleSensorInstanceInfoRequest(sensorInstanceInfoRequest);
    });

    bus.$on("latestminutestats", async (latestminutestats) => {
      console.log("Home::on::latestminutestats: ");
      await that.updateSensorStatsByLatestMinute(latestminutestats);
    });

    bus.$on("procdailystats", async (procdailystats) => {
      console.log("Home::on::procdailystats: ");
      await that.updateDailyStats(procdailystats);
    });

    bus.$on("completedprocinfo", async (completedprocinfo) => {
      console.log("Home::on::completedprocinfo: ", completedprocinfo);
      await that.updateCompletedProcessList(completedprocinfo);
    });

    this.resetFacility();
    //  bus.$emit("sensorInstanceInfoPublish", this.sensors);

    console.log("event bus in created end:", bus);

    // Get list of completed processes if there are any:
    await this.initializeCompletedProcessList();
  },
  async mounted() {
    console.log("Home Component: mounted() hook called!");
    this.resetFacility();
    const facilityconfiguration = {
      totalruntime: FACILITY_RUN_SECONDS,
      currentPctComplete: round(this.pctComplete, 2),
      currentStatus: this.facilitystatus,
      currentProcessId: this.currentProcessId,
    };
    bus.$emit("facilityconfigpublish", facilityconfiguration);
    bus.$emit("sensorInstanceInfoPublish", this.sensors);
  },
  async beforeDestroy() {
    console.log("Home Component: beforeUnmount() hook called");
    console.log("event bus in beforeDestroy beginning:", bus);

    let offlineStatus = "";
    const facilitystatus = this.$store.getters.facilityStatus;
    switch (facilitystatus.status) {
      case "IDLE":
        offlineStatus = "IDLE-OFFLINE";
        break;
      case "RUNNING":
        offlineStatus = "RUNNING-OFFLINE";
        break;
      case "STOPPED":
        offlineStatus = "STOPPED-OFFLINE";
        break;
      case "PAUSED":
        offlineStatus = "PAUSED-OFFLINE";
        break;
      case "COMPLETE":
        offlineStatus = "COMPLETE-OFFLINE";
        break;
      case "COMPLETING":
        offlineStatus = "COMPLETING-OFFLINE";
        break;
    }

    const udpatedFacilityStatus = {
      facilityId: facilitystatus.facilityId,
      status: offlineStatus,
    };
    this.$store.dispatch("setFacilityStatus", udpatedFacilityStatus);
    bus.$emit("facilitystatusupdate", udpatedFacilityStatus);

    bus.$off("message");
    bus.$off("stopsimulator");
    bus.$off("facilitycommandreceived");
    bus.$off("facilityconfigrequest");
    bus.$off("sensorInstanceInfoRequest");
    bus.$off("procdailystats");
    bus.$off("completedprocinfo");
    bus.$off("latestminutestats");

    console.log("event bus in beforeDestroy end:", bus);
  },
  methods: {
    generateSensors() {
      let sensorTypeConfigurations = this.$store.getters
        .sensortypeConfigurations;
      // console.log("Sensor types: ", this.sensortypes);
      console.log("Sensor types: ", sensorTypeConfigurations);
      var idCount = 0;
      for (let j = 0; j < sensorTypeConfigurations.length; j++) {
        const sensortype = sensorTypeConfigurations[j];
        for (let i = 0; i < sensortype.totalnumber; i++) {
          const sensorObj = {
            id: idCount++,
            name: sensortype.name + "_" + i,
            typeId: sensortype.typeId,
          };
          // console.log("sensorObj: ", sensorObj);
          this.sensors.push(sensorObj);
        }
      }
      console.log("Generated sensors: ", this.sensors);
    },

    async initializeSensorTypesConfiguration() {
      // Check if current sensor configurations for the facility exists in the database:
      const urlGetConfig = `${this.$store.getters.appConfiguration.APIendpoint}/facilitysensorconfig?facilityId=${sensorconfig.facilityId}`;

      var response;
      try {
        response = await axios.get(urlGetConfig, {
          headers: {
            Authorization: this.$store.getters.authCredentials.sessionToken,
          },
        });
        console.log("Got response for sensor configuration: ", response);
        if (response.data.length === 0) {
          // Store sensor configurations for the facility in the database:
          try {
            const urlPostConfig = `${this.$store.getters.appConfiguration.APIendpoint}/savefacilitysensorconfig?facilityId=${sensorconfig.facilityId}`;
            const response = await axios.post(urlPostConfig, {
              headers: {
                Authorization: this.$store.getters.authCredentials.sessionToken,
              },
              payload: {
                sensortypes: sensorconfig.sensortypes,
              },
            });
            console.log("response after post: ", response);
          } catch (err) {
            console.log("error saving sensor configuration:", err);
          }
        } else {
          sensorconfig.sensortypes = [];
          console.log("response data[0]: ", response.data[0]);
          let sensortypes = JSON.parse(response.data[0].sensortypes);
          sensortypes.map((sensortype) => {
            sensorconfig.sensortypes.push(sensortype);
          });
        }
        //  console.log("response sensor types:", response.data[0].sensortypes);
      } catch (err) {
        console.log("Failed to read sensor configuration: ", err.message);
      }

      let sensortypeConfigurations = [];
      sensorconfig.sensortypes.map((sensortype) => {
        sensortypeConfigurations.push(sensortype);
      });
      console.log("sensortypeConfigurations: ", sensortypeConfigurations);
      // Update vuex state for sensor type configurations.
      // Note that this will also generate sensor instances
      // based on type configurations.
      this.$store.dispatch(
        "setConfiguredSensorTypes",
        sensortypeConfigurations
      );
    },

    // User selected completed process ID from dropdown:
    async updatedProcessId() {
      console.log("Selected process ID:", this.selectedProcessId);
      await this.updateSelectedProcessStats();
    },

    async updateSelectedProcessStats() {
      console.log("updatedSelectedProcStats: ", this.statsForSelectedProcessId);
      this.statsForSelectedProcessId = [];

      const URL = `${this.$store.getters.appConfiguration.APIendpoint}/processStats?processId=${this.selectedProcessId}`;

      let response;
      try {
        response = await axios.get(URL, {
          headers: {
            Authorization: this.$store.getters.authCredentials.sessionToken,
          },
        });
        //   console.log("Got response for selected process: ", response);
      } catch (err) {
        console.log("Getting completed process stats errror: ", err.message);
      }

      console.log("response:", response);
      console.log("response stats:", response.data[0].stats);
      let stringifiedStatsForSelectedProcess = response.data[0].stats;
      let statsForSelectedProcess = JSON.parse(
        stringifiedStatsForSelectedProcess
      );

      console.log("statsForSelectedProcess:", statsForSelectedProcess);

      // Update selected process stats:
      for (let sensorId in statsForSelectedProcess) {
        this.statsForSelectedProcessId.push({
          sensorId: sensorId,
          name: statsForSelectedProcess[sensorId].name,
          min: round(statsForSelectedProcess[sensorId].min_val, 2),
          max: round(statsForSelectedProcess[sensorId].max_val, 2),
          median: round(statsForSelectedProcess[sensorId].median_val, 2),
          stddev: round(statsForSelectedProcess[sensorId].stddev_val, 2),
          ts: statsForSelectedProcess.ts,
        });
      }

      // Convert to array
      console.log(
        "this.statsForSelectedProcessId: ",
        this.statsForSelectedProcessId
      );

      const selectedProcessInfo = {
        selectedProcessId: this.selectedProcessId,
        completedProcessStats: this.statsForSelectedProcessId,
      };

      this.$store.dispatch("setCompletedProcessInfo", selectedProcessInfo);
    },
    async initializeCompletedProcessList() {
      const URL = `${this.$store.getters.appConfiguration.APIendpoint}/completedProcesses`;

      let response;
      try {
        response = await axios.get(URL, {
          headers: {
            Authorization: this.$store.getters.authCredentials.sessionToken,
          },
        });
        console.log("Got response for completed processes: ", response);
      } catch (err) {
        console.log("Getting completed process stats errror: ", err.message);
      }

      console.log("response processes list:", response.data);

      this.completedProcesses = response.data.map((item) => item.processId);
    },
    // When process completes, update the completed process list:
    async updateCompletedProcessList(completedprocinfo) {
      this.completedProcesses.push(completedprocinfo.processId);

      // Set the status of the current process to "COMPLETE":
      const udpatedFacilityStatus = {
        facilityId: this.$store.getters.facilityStatus.facilityId,
        status: "COMPLETE",
      };
      this.$store.dispatch("setFacilityStatus", udpatedFacilityStatus);
    },

    // When an operator logs in, the operator app sends configuration request:
    async handleConfigurationRequest(receivedconfigrequest) {
      console.log("Facility configuration request:", receivedconfigrequest);
      const facilityconfiguration = {
        totalruntime: FACILITY_RUN_SECONDS,
        currentPctComplete: round(this.pctComplete, 2),
        currentStatus: this.facilitystatus,
        currentProcessId: this.currentProcessId,
      };
      bus.$emit("facilityconfigpublish", facilityconfiguration);
    },

    // When an operator logs in, the operator app sends configuration request:
    async handleSensorInstanceInfoRequest(sensorInstanceInfoRequest) {
      console.log("Sensor instance info request:", sensorInstanceInfoRequest);

      bus.$emit("sensorInstanceInfoPublish", this.sensors);
    },

    async executeCommand(receivedcommand) {
      const facilitystatus = this.$store.getters.facilityStatus;
      console.log("currentStatus:", facilitystatus);
      console.log("executeCommand() - command:", receivedcommand.command);

      switch (receivedcommand.command) {
        case "start":
          if (
            facilitystatus.status === "IDLE" ||
            facilitystatus.status === "COMPLETE"
          ) {
            // Transition to 'running' state:
            this.launchFacility();
            // Note that in admin dashboard, we execute the command,
            // update the status of simulator, and then publish the status update
            // to IoT.
            const udpatedFacilityStatus = {
              facilityId: 1,
              status: "RUNNING",
            };
            this.$store.dispatch("setFacilityStatus", udpatedFacilityStatus);
            bus.$emit("currentProcessIdPublish", this.currentProcessId);
            bus.$emit("facilitystatusupdate", udpatedFacilityStatus);
          }
          break;

        case "stop":
          if (
            facilitystatus.status === "RUNNING" ||
            facilitystatus.status === "PAUSED"
          ) {
            // Transition to 'STOPPED' state:
            this.stopFacility();
          }
          break;
        case "pause":
          if (facilitystatus.status === "RUNNING") {
            // Transition to 'paused' state:
            this.pauseFacility();
            const udpatedFacilityStatus = {
              facilityId: facilitystatus.facilityId,
              status: "PAUSED",
            };

            this.$store.dispatch("setFacilityStatus", udpatedFacilityStatus);
            bus.$emit("facilitystatusupdate", udpatedFacilityStatus);
          }
          break;
        case "resume":
          if (facilitystatus.status === "PAUSED") {
            // Transition to 'running' state:
            this.resumeFacility();

            const udpatedFacilityStatus = {
              facilityId: facilitystatus.facilityId,
              status: "RUNNING",
            };
            this.$store.dispatch("setFacilityStatus", udpatedFacilityStatus);
            bus.$emit("facilitystatusupdate", udpatedFacilityStatus);
          }
          break;
        case "reset":
          if (
            facilitystatus.status === "STOPPED" ||
            facilitystatus.status === "COMPLETE"
          ) {
            // Transition to 'IDLE' state:
            this.resetFacility();

            const udpatedFacilityStatus = {
              facilityId: facilitystatus.facilityId,
              status: "IDLE",
            };
            this.$store.dispatch("setFacilityStatus", udpatedFacilityStatus);
            bus.$emit("facilitystatusupdate", udpatedFacilityStatus);
          }
          break;
      }
    },
    // Update real-time sensor data panel:
    async updateRealtimeSensorData(sensormessage) {
      let sensorData = JSON.parse(sensormessage);
      let intermediateSensorData = [];

      // console.log("updateRealtimeSensorData: ", sensorData);
      console.log("this.facilitystatus:", this.facilitystatus);

      if (
        this.facilitystatus.status === "COMPLETING" ||
        this.facilitystatus.status === "COMPLETE"
      ) {
        return;
      }

      // Update internal realtime sensor data
      for (let sensorId in sensorData) {
        // TODO: check if this is needed
        if (!this.sensors[sensorId]) {
          continue;
        }

        this.realtimeSensorData[sensorId] = {
          sensorId: sensorId,
          name: this.sensors[sensorId].name,
          typeId: this.sensors[sensorId].typeId,
          sensordata: round(sensorData[sensorId], 2),
        };

        intermediateSensorData = Object.values(this.realtimeSensorData);

        // intermediateSensorData.push({
        //   sensorId,
        //   name: this.sensors[sensorId].name,
        //   typeId: this.sensors[sensorId].typeId,
        //   sensordata: round(sensorData[sensorId], 2),
        // });
      }

      this.realtimeSensorDisplay = intermediateSensorData;
    },

    async updateDailyStats(dailyStatsData) {
      console.log("updateDailyStats() dailyStatsData:", dailyStatsData);

      // Check to make sure these are daily stats of the current process.
      // Note that here we check to make sure that we don't display daily data
      // of the previous process which was stopped before it completed.
      if (dailyStatsData.processId !== `proc-${this.currentProcessId}`) {
        console.log("Current process ID doesn't match the dailyStatsData");
        return;
      }

      let processDailyDataStats = JSON.parse(dailyStatsData.stats);
      console.log(
        "updateDailyStats processDailyDataStats: ",
        processDailyDataStats
      );
      // console.log("this.dailySensorStats: ", this.dailySensorStats);

      let intermediateSensorStats = [];

      // Update daily sensor stats
      for (let sensorId in processDailyDataStats) {
        this.dailySensorStats[sensorId] = {
          sensorId: sensorId,
          name: processDailyDataStats[sensorId].name,
          min: round(processDailyDataStats[sensorId].min_val, 2),
          max: round(processDailyDataStats[sensorId].max_val, 2),
          median: round(processDailyDataStats[sensorId].median_val, 2),
          stddev: round(processDailyDataStats[sensorId].stddev_val, 2),
          ts: dailyStatsData.ts,
        };
      }

      // Convert to array
      console.log("this.dailySensorStats: ", this.dailySensorStats);
      for (let sensorId in this.dailySensorStats) {
        intermediateSensorStats.push(this.dailySensorStats[sensorId]);
      }

      this.$store.dispatch("setDailySenorStats", intermediateSensorStats);
      //console.log("this.dailyStatsDisplay: ", this.dailyStatsDisplay);
    },

    // Sensor stats by latest minute
    async updateSensorStatsByLatestMinute(latestminutestats) {
      // console.log(
      //   "updateSensorStatsByLatestMinute 'latestminutestats': ",
      //   latestminutestats
      // );

      // Check to make sure these are the latest minute stats
      // of the current process.
      // Note that here we check to make sure that we don't display daily data
      // of the previous process which was stopped before it completed.
      if (latestminutestats.processId !== `proc-${this.currentProcessId}`) {
        console.log(
          `Current process ID: ${this.currentProcessId} doesn't match the latestminutestats process ID: ${latestminutestats.processId}`
        );
        return;
      }

      let statsResults = JSON.parse(latestminutestats.sensorstats);
      let intermediateSensorStats = [];

      statsResults.map((sensorstats) => {
        // Update sensor stats by latest minute:
        this.latestMinuteSensorStats[sensorstats.sensorId] = {
          sensorId: sensorstats.sensorId,
          name: sensorstats.name,
          min: round(sensorstats.min_value, 2),
          max: round(sensorstats.max_value, 2),
          stddev: round(sensorstats.stddev_value, 2),
          ts: new Date(sensorstats.deviceTimestamp).toLocaleTimeString("en-US"),
        };
      });

      intermediateSensorStats = Object.values(this.latestMinuteSensorStats);
      console.log("intermediateSensorStats:", intermediateSensorStats);

      this.latestMinuteSensorStatsDisplay = intermediateSensorStats;
    },

    /*************************************
     **  SENSOR LOGIC AND PUBLISHING   **
     *************************************/
    onStart() {
      console.log("start");
      this.issuedcommand = "start";
      const facilityCommand = {
        command: this.issuedcommand,
        facilityId: this.$store.getters.facilityStatus.facilityId,
      };

      console.log("Issued start command: ", facilityCommand);
      bus.$emit("facilitycommandissued", facilityCommand);
    },
    onStop() {
      console.log("Stop command issued");

      this.issuedcommand = "stop";
      const facilityCommand = {
        command: this.issuedcommand,
        facilityId: this.$store.getters.facilityStatus.facilityId,
      };

      console.log("Issued stop command: ", facilityCommand);
      bus.$emit("facilitycommandissued", facilityCommand);
    },
    onPause() {
      console.log("Pause command issued");

      this.issuedcommand = "pause";
      const facilityCommand = {
        command: this.issuedcommand,
        facilityId: this.$store.getters.facilityStatus.facilityId,
      };

      console.log("Issued pause command: ", facilityCommand);
      bus.$emit("facilitycommandissued", facilityCommand);
    },
    onResume() {
      console.log("Resume command issued");

      this.issuedcommand = "resume";
      const facilityCommand = {
        command: this.issuedcommand,
        facilityId: this.$store.getters.facilityStatus.facilityId,
      };

      console.log("Issued resume command: ", facilityCommand);
      bus.$emit("facilitycommandissued", facilityCommand);
    },
    onReset() {
      console.log("reset command issued");

      this.issuedcommand = "reset";
      const facilityCommand = {
        command: this.issuedcommand,
        facilityId: this.$store.getters.facilityStatus.facilityId,
      };

      console.log("Issued reset command: ", facilityCommand);
      bus.$emit("facilitycommandissued", facilityCommand);
    },
    launchFacility() {
      console.log("Start facility");
      this.currentSecond = 500;
      this.processId = Date.now();
      this.$store.dispatch("setCurrentProcessId", this.processId);
      this.pctComplete = 0;
      this.sensorsToPublish.length = 0;
      this.event = "update";
      // We need to set sensors every time before starting a new process
      // in case the configuration has been updated.
      this.sensors = this.$store.getters.sensorInstances;

      this.intervalVar = setInterval(this.nextInterval, 1000);

      this.sensors.forEach((sensor) => {
        this.sensor = new Sensor(sensor);
        this.sensorsToPublish.push(this.sensor);
      });

      console.log("this.sensorsToPublish: ", this.sensorsToPublish);
    },

    stopFacility() {
      clearInterval(this.intervalVar);

      const udpatedFacilityStatus = {
        facilityId: this.$store.getters.facilityStatus.facilityId,
        status: "STOPPED",
      };
      this.$store.dispatch("setFacilityStatus", udpatedFacilityStatus);

      this.$store.dispatch("setPctComplete", this.pctComplete);
      bus.$emit("facilitystatusupdate", udpatedFacilityStatus);
      console.log("Facility was stopped");
    },
    pauseFacility() {
      clearInterval(this.intervalVar);

      // Facility was paused, reset current process settings:
      console.log("Facility was paused");
    },
    resumeFacility() {
      console.log("Resume facility process");
      this.intervalVar = setInterval(this.nextInterval, 1000);
    },
    resetFacility() {
      clearInterval(this.intervalVar);

      // Reset current process info:
      this.pctComplete = 0;
      this.currentSecond = 0;
      this.processId = 0;
      this.dailySensorStats = [];
      this.realtimeSensorData = {};
      this.realtimeSensorDisplay = [];
      this.latestMinuteSensorStatsDisplay = [];
      this.latestMinuteSensorStats = {};
      this.sensorsToPublish.length = 0;
      const udpatedFacilityStatus = {
        facilityId: 1,
        status: "IDLE",
      };
      this.$store.dispatch("setFacilityStatus", udpatedFacilityStatus);
      this.$store.dispatch("setCurrentProcessId", this.processId);
      this.$store.dispatch("setPctComplete", this.pctComplete);
      this.$store.dispatch("setDailySenorStats", this.dailySensorStats);
      // Update all subscribers that facility was reset:
      bus.$emit("facilitystatusupdate", udpatedFacilityStatus);
      // bus.$emit("updatepercentcomplete", this.pctComplete);
      // bus.$emit("currentProcessIdPublish", this.processId);
      console.log("Facility was reset");
    },

    async nextInterval() {
      console.log("In nextInterval current second: ", this.currentSecond);
      if (this.currentSecond > FACILITY_RUN_SECONDS + INTERVAL_SECONDS) return;

      // Check if the process completed and we just need to notify the backend
      // about that:
      if (this.currentSecond === FACILITY_RUN_SECONDS + INTERVAL_SECONDS) {
        console.log("Issue complete message for second:", this.currentSecond);
        clearInterval(this.intervalVar);

        const udpatedFacilityStatus = {
          facilityId: this.$store.getters.facilityStatus.facilityId,
          status: "COMPLETING",
        };

        // TODO: move updating of facility status and pctcomplete into a separate function
        this.$store.dispatch("setFacilityStatus", udpatedFacilityStatus);
        this.$store.dispatch("setPctComplete", this.pctComplete);
        //  console.log("pctComplete: ", this.pctComplete);
        bus.$emit("updatepercentcomplete", {
          facilityid: udpatedFacilityStatus.facilityId,
          pctcomplete: round(this.pctComplete, 2),
        });
        bus.$emit("facilitystatusupdate", udpatedFacilityStatus);

        // Finally, if the process is complete then send
        // the last message for this process with event status as "complete":
        this.event = "complete";
        const sensormessage = {
          uuid: uuidv4(),
          event: this.event,
          deviceTimestamp: Date.now(),
          second: this.currentSecond,
          processId: this.processId,
          facilityId: udpatedFacilityStatus.facilityId,
        };
        bus.$emit("sensorpublish", sensormessage);
        this.currentSecond += INTERVAL_SECONDS;

        return;
      }

      // console.log(`Second ${this.currentSecond} of ${FACILITY_RUN_SECONDS}`);
      // Interval step
      this.pctComplete = round(
        (this.currentSecond / FACILITY_RUN_SECONDS) * 100,
        2
      );

      // console.log("this.currentSecond:", this.currentSecond);
      const facilityId = this.$store.getters.facilityStatus.facilityId;
      this.sensorsToPublish.forEach((sensor) => {
        //   console.log("sensor to publish: ", sensor);
        // Publish the sensor's current value
        const sensorData = simulateSensorData(sensor.minval, sensor.maxval);
        // console.log("sensordata: ", sensorData);
        // console.log("sensor name: ", this.sensors[sensor]);
        const sensormessage = {
          uuid: uuidv4(),
          event: this.event,
          deviceTimestamp: Date.now(),
          second: this.currentSecond,
          name: sensor.name,
          sensorId: sensor.id,
          processId: this.processId,
          facilityId: facilityId,
          sensorData: sensorData,
        };

        bus.$emit("sensorpublish", sensormessage);
      });

      this.$store.dispatch("setPctComplete", this.pctComplete);
      bus.$emit("updatepercentcomplete", {
        facilityid: facilityId,
        pctcomplete: round(this.pctComplete, 2),
      });

      this.currentSecond += INTERVAL_SECONDS;
      // console.log("this.currentSecond: ", this.currentSecond);
      // console.log("this.pctcomplete: ", this.pctComplete);
    },
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
.fade-enter-active,
.fade-leave-active {
  transition: all 1s;
}
.fade-enter, .fade-leave-to /* .fade-leave-active below version 2.1.8 */ {
  opacity: 0;
}
.row-table {
  display: table-row;
}
</style>

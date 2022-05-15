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
              <!-- Progress bar showing % complete of total facility runtime process-->
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

import sensorconfig from "@/configurations/sensorconfig.json";

//import { gunzip } from "@/lib/gzip";
import axios from "axios";

// Libraries
//const Sensor = require("@/lib/sensor");
import appStore from "../store";

const round = (value, decimals) => {
  return Number(Math.round(value + "e" + decimals) + "e-" + decimals);
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
      totalRuntime: 0,
      processId: 0,
      event: "",
      sensors: [],
      sensortypes: sensorconfig.sensortypes,
      sensorId: 0,
      issuedcommand: null,
      sensor: {},
      sensorsToPublish: [],
      realtimeSensorData: {},
      latestMinuteSensorStats: {},
      realtimeSensorDisplay: [],
      latestMinuteSensorStatsDisplay: [],
      dailySensorStats: {},
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
    const that = this;

    this.selectedProcessId = this.$store.getters.completedProcessInfo.selectedProcessId;

    // When messages are received via IOT, these handlers are triggered
    bus.$on("message", async (message) => {
      //console.log("Home::on::message: ", message);

      if (message.msg === "sensordata") {
        // console.log("Received sensor data message: ", message);
        await that.updateRealtimeSensorData(message.sensordata);
      }

      if (message.msg === "sensorstats") {
        //  console.log("Received sensor stats message: ", message);
        await that.updateSensorStatsByLatestMinute(message.sensorstats);
      }
    });

    bus.$on("facilitystatusupdated", async (statusupdate) => {
      //console.log("Home::on::facilitystatus: ", statusupdate);
      await that.updateFacilityStatus(statusupdate);
    });

    bus.$on("facilityconfigupdate", async (configupdateinfo) => {
      //console.log("Home::on::facilityconfigupdate: ", configupdateinfo);
      await that.updateFacilityConfigInfo(configupdateinfo);
    });

    bus.$on("sensorInstanceInfoUpdate", async (sensorInstanceInfoUpdate) => {
      console.log(
        "Home::on::sensorInstanceInfoUpdate: ",
        sensorInstanceInfoUpdate
      );
      await that.updateSensorInstanceInfo(sensorInstanceInfoUpdate);
    });

    bus.$on("procdailystats", async (procdailystats) => {
      console.log("Home::on::procdailystats: ");
      await that.updateDailyStats(procdailystats);
    });

    bus.$on("completedprocinfo", async (completedprocinfo) => {
      console.log("Home::on::completedprocinfo: ", completedprocinfo);
      await that.updateCompletedProcessList(completedprocinfo);
    });

    bus.$on("updatepercentcomplete", async (percentCompleteUpdate) => {
      //console.log("Home::on::updatepercentcomplete: ", percentCompleteUpdate);
      that.pctComplete = percentCompleteUpdate.pctcomplete;
      that.$store.dispatch("setPctComplete", that.pctComplete);
    });

    bus.$on("updateCurrentProcessId", async (currentProcessIdUpdate) => {
      console.log(
        "Home::on::updateSelectedProcessId: ",
        currentProcessIdUpdate
      );
      that.processId = currentProcessIdUpdate;
      that.$store.dispatch("setCurrentProcessId", that.processId);
    });

    // Get list of completed processes if there are any:
    await this.initializeCompletedProcessList();
  },
  async beforeDestroy() {
    console.log("Home Component: beforeUnmount() hook called");
    console.log("event bus in beforeDestroy beginning:", bus);

    bus.$off("message");
    bus.$off("facilitystatusupdated");
    bus.$off("facilitycommandreceived");
    bus.$off("facilityconfigupdate");
    bus.$off("sensorInstanceInfoUpdate");
    bus.$off("procdailystats");
    bus.$off("completedprocinfo");
    bus.$off("updateCurrentProcessId");

    console.log("event bus in beforeDestroy end:", bus);
  },
  methods: {
    async updateFacilityConfigInfo(configupdateinfo) {
      this.$store.dispatch("setFacilityStatus", configupdateinfo.currentStatus);
      console.log("Facility status: ", configupdateinfo.currentStatus.status);

      this.pctComplete = configupdateinfo.currentPctComplete;
      this.$store.dispatch(
        "setPctComplete",
        configupdateinfo.currentPctComplete
      );
      // console.log("pctComplete: ", this.pctComplete);
      // Convert to minutes
      this.totalRuntime = configupdateinfo.totalruntime / 60;
      console.log("totalRuntime: ", this.totalRuntime);
      // Set current process ID:
      this.processId = configupdateinfo.currentProcessId;
      this.$store.dispatch(
        "setCurrentProcessId",
        configupdateinfo.currentProcessId
      );
    },
    async updateSensorInstanceInfo(sensorInstanceInfoUpdate) {
      this.sensors.length = 0;
      console.log("updateSensorInstanceInfo:", sensorInstanceInfoUpdate);

      sensorInstanceInfoUpdate.map((sensorInstance) => {
        const sensorObj = {
          id: sensorInstance.Id,
          name: sensorInstance.name,
          typeId: sensorInstance.typeId,
          minval: sensorInstance.minval,
          maxval: sensorInstance.maxval,
        };
        this.sensors.push(sensorObj);
      });
      this.$store.dispatch("setSensorInstances", this.sensors);
    },
    async updateFacilityStatus(statusupdate) {
      const currentStatus = this.$store.getters.facilityStatus;
      console.log("currentStatus:", currentStatus);
      console.log("updateFacilityStatus() - status", statusupdate);

      // If facility status transitioned to 'IDLE',
      // reset current process info:
      if (statusupdate.status === "IDLE") {
        this.processId = 0;
        this.pctComplete = 0;
        this.realtimeSensorDisplay = [];
        this.$store.dispatch("setCurrentProcessId", this.processId);
        this.$store.dispatch("setPctComplete", this.pctComplete);
        this.$store.dispatch("setDailySenorStats", []);
      }

      this.$store.dispatch("setFacilityStatus", statusupdate);
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

    // Update real-time sensor data panel:
    async updateRealtimeSensorData(sensormessage) {
      let sensorData = JSON.parse(sensormessage);
      let intermediateSensorData = [];

      // console.log("updateRealtimeSensorData: ", sensorData);

      if (
        this.facilitystatus.status === "COMPLETING" ||
        this.facilitystatus.status === "COMPLETE"
      ) {
        return;
      }

      // TODO: refactor to use one message per facility and set current second
      // on the facility instead of on each sensor message:

      // Update internal realtime sensor data
      for (let sensorId in sensorData) {
        if (!this.sensors[sensorId]) {
          continue;
        }

        intermediateSensorData.push({
          sensorId,
          name: this.sensors[sensorId].name,
          typeId: this.sensors[sensorId].typeId,
          sensordata: round(sensorData[sensorId], 2),
        });
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
    async updateSensorStatsByLatestMinute(sensorStatsMessage) {
      // console.log(
      //   "updateSensorStatsByLatestMinute 'sensorStatsMessage': ",
      //   sensorStatsMessage
      // );

      let statsResults = JSON.parse(sensorStatsMessage);
      let intermediateSensorStats = [];

      //console.log("updateSensorStatsByLatestMinute: ", statsResults);

      // Update sensor stats by latest minute:
      this.latestMinuteSensorStats[statsResults.sensorId] = {
        sensorId: statsResults.sensorId,
        name: statsResults.name,
        min: round(statsResults.min_value, 2),
        max: round(statsResults.max_value, 2),
        stddev: round(statsResults.stddev_value, 2),
        ts: statsResults.deviceTimestamp,
      };

      // Convert to array
      for (let sensorId in this.latestMinuteSensorStats) {
        intermediateSensorStats.push(this.latestMinuteSensorStats[sensorId]);
      }

      this.latestMinuteSensorStatsDisplay = intermediateSensorStats;
    },

    /*************************************
     **  SENSOR LOGIC AND PUBLISHING   **
     *************************************/
    onStart() {
      console.log("start");

      this.pctComplete = 0;
      this.event = "update";

      this.issuedcommand = "start";
      const facilityCommand = {
        command: this.issuedcommand,
        facilityId: 1,
      };

      console.log("Issued start command: ", facilityCommand);
      bus.$emit("facilitycommandissued", facilityCommand);
    },
    onStop() {
      console.log("Stop command issued");
      // TODO: Why are we setting this:
      this.event = "update";

      this.issuedcommand = "stop";
      const facilityCommand = {
        command: this.issuedcommand,
        facilityId: 1,
      };

      console.log("Issued stop command: ", facilityCommand);
      bus.$emit("facilitycommandissued", facilityCommand);
    },
    onPause() {
      console.log("Pause command issued");
      // TODO: Why are we setting this:
      this.event = "update";

      this.issuedcommand = "pause";
      const facilityCommand = {
        command: this.issuedcommand,
        facilityId: 1,
      };

      console.log("Issued pause command: ", facilityCommand);
      bus.$emit("facilitycommandissued", facilityCommand);
    },
    onResume() {
      console.log("Resume command issued");
      // TODO: Why are we setting this:
      this.event = "update";

      this.issuedcommand = "resume";
      const facilityCommand = {
        command: this.issuedcommand,
        facilityId: 1,
      };

      console.log("Issued resume command: ", facilityCommand);
      bus.$emit("facilitycommandissued", facilityCommand);
    },
    onReset() {
      console.log("reset command issued");

      this.issuedcommand = "reset";
      const facilityCommand = {
        command: this.issuedcommand,
        facilityId: 1,
      };

      console.log("Issued reset command: ", facilityCommand);
      bus.$emit("facilitycommandissued", facilityCommand);
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

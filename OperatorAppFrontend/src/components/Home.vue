<template>
  <v-container>
    <IoT />
    <v-row>
      <v-container fluid>
        <h1>Facility 1</h1>
        <v-row dense>
          <!-- Facility Dashboard -->
          <v-col>
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
                <v-list-item align="left"> </v-list-item>
              </v-card-actions>
            </v-card>
          </v-col>
          <!-- Sensor data -->
          <!-- TODO: is this needed? -->
          <v-col cols="12" md="4"> </v-col>
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
      <v-col cols="12" md="3">
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
      <v-col cols="12" md="5">
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
      <!-- Cumulative daily stats -->
      <v-col cols="12" md="4">
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
    currentPctComplete() {
      return this.$store.getters.getPctComplete;
    },
    dailyStatsDisplay() {
      return this.$store.getters.dailySensorStats;
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
      dailyDataIntervalVar: null,
      sensorsForSelectedFacility: [],
      resultsForSelectedFacility: {},
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

    // TODO: configuration info should come from admin node
    this.generateSensors();

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

    // bus.$on("sensormessage", async (sensormessage) => {
    //   //  console.log("Home::on::sensormessage: ", sensormessage);

    //   // Update realtime data
    //   if (sensormessage.msg === "results") {
    //     await that.updateRealtimeSensorData(sensormessage.results);
    //   }
    // });

    bus.$on("facilitystatusupdated", async (statusupdate) => {
      //console.log("Home::on::facilitystatus: ", statusupdate);
      await that.updateFacilityStatus(statusupdate);
    });

    bus.$on("facilityconfigupdate", async (configupdateinfo) => {
      //console.log("Home::on::facilityconfigupdate: ", configupdateinfo);
      await that.updateFacilityConfigInfo(configupdateinfo);
    });

    bus.$on("procdailystats", async (procdailystats) => {
      console.log("Home::on::procdailystats: ");
      await that.updateDailyStats(procdailystats);
    });

    bus.$on("updatepercentcomplete", async (percentCompleteUpdate) => {
      //console.log("Home::on::updatepercentcomplete: ", percentCompleteUpdate);
      that.pctComplete = percentCompleteUpdate.pctcomplete;
      that.$store.dispatch("setPctComplete", that.pctComplete);
    });
  },
  methods: {
    // TODO: this should come from admin node.
    generateSensors() {
      //console.log("Sensor types: ", this.sensortypes);

      var idCount = 0;
      for (let j = 0; j < this.sensortypes.length; j++) {
        const sensortype = this.sensortypes[j];
        for (let i = 0; i < sensortype.totalnumber; i++) {
          const sensorObj = {
            id: idCount++,
            name: sensortype.name + "_" + i,
            typeId: sensortype.typeId,
          };
          //console.log("sensorObj: ", sensorObj);
          this.sensors.push(sensorObj);
        }
      }
      //console.log("Generated sensors: ", this.sensors);
    },

    async updateFacilityConfigInfo(configupdateinfo) {
      this.$store.dispatch("setFacilityStatus", configupdateinfo.currentStatus);
      console.log("Facility status: ", configupdateinfo.currentStatus.status);
      // if (configupdateinfo.currentStatus.status === "RUNNING") {
      //   this.dailyDataIntervalVar = setInterval(
      //     this.nextDailyDataInterval,
      //     30000
      //   );
      // } else {
      //   clearInterval(this.dailyDataIntervalVar);
      // }
      this.pctComplete = configupdateinfo.currentPctComplete;
      this.$store.dispatch(
        "setPctComplete",
        configupdateinfo.currentPctComplete
      );
      // console.log("pctComplete: ", this.pctComplete);
      // Convert to minutes
      this.totalRuntime = configupdateinfo.totalruntime / 60;
      console.log("totalRuntime: ", this.totalRuntime);
    },
    async updateFacilityStatus(statusupdate) {
      const currentStatus = this.$store.getters.facilityStatus;
      console.log("currentStatus:", currentStatus);
      console.log("updateFacilityStatus() - status", statusupdate);

      // if (statusupdate.status === "RUNNING") {
      //   this.dailyDataIntervalVar = setInterval(
      //     this.nextDailyDataInterval,
      //     30000
      //   );
      // } else {
      //   clearInterval(this.dailyDataIntervalVar);
      // }

      this.$store.dispatch("setFacilityStatus", statusupdate);
    },
    // Update real-time sensor data panel:
    async updateRealtimeSensorData(sensormessage) {
      let sensorData = JSON.parse(sensormessage);
      let intermediateSensorData = [];
      // console.log("updateRealtimeSensorData is called!!!");

      // console.log("updateRealtimeSensorData: ", sensorData);

      // TODO: refactor to use one message per facility and set current second
      // on the facility instead of on each sensor message:

      // Update internal realtime sensor data
      for (let sensorId in sensorData) {
        // if (!this.sensors[sensorId]) {
        //   continue;
        // }
        //   console.log("sensor current result update by id: ",this.sensors[sensorId]);
        // this.realtimeSensorData[sensorId] = {
        //   sensorId: sensorId,
        //   name: this.sensors[sensorId].name,
        //   typeId: this.sensors[sensorId].typeId,
        //   output: round(sensorData[sensorId], 2),
        // };

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
      // of the process which was stopped before it completed.
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

      //  this.dailyStatsDisplay = intermediateSensorStats;
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
    async nextDailyDataInterval() {
      console.log("nextDailyDataInterval() was called");
      console.log(
        "Current facility status: ",
        this.$store.getters.facilityStatus
      );

      const URL = `${this.$store.getters.appConfiguration.APIendpoint}/dailyStats?facilityId=1`;
      console.log("Getting daily data at: ", URL);
      // console.log(
      //   "Session token: ",
      //   this.$store.getters.authCredentials.sessionToken

      //);
      var response;
      try {
        response = await axios.get(URL, {
          headers: {
            Authorization: this.$store.getters.authCredentials.sessionToken,
          },
        });
        // console.log("Got response for daily data: ", response);
      } catch (err) {
        console.log("Getting daily data errror: ", err.message);
      }

      this.sensorsForSelectedFacility = [];
      this.sensorsForSelectedFacility = response.data.map(
        (item) => item.sensorId
      );
      this.resultsForSelectedFacility = response.data;
      // console.log(
      //   "Updated daily facility sensors :",
      //   this.sensorsForSelectedFacility
      // );
      // console.log(
      //   "Updated daily facility data :",
      //   this.resultsForSelectedFacility
      // );

      this.updateDailyStats(this.resultsForSelectedFacility);
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

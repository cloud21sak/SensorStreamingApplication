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
                  v-if="
                    (facilitystatus.status === 'IDLE' ||
                      facilitystatus.status === 'COMPLETE') &&
                      isLoggedIn
                  "
                  elevation="2"
                  outlined
                  @click="onStart()"
                  >Launch Facility</v-btn
                >
                <v-btn
                  color="orange"
                  v-if="facilitystatus.status === 'RUNNING'"
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
                      facilitystatus.status === 'PAUSED'
                  "
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
import { v4 as uuidv4 } from "uuid";

// SAK???
//import sensors from "@/configurations/sensors.json";
import sensorconfig from "@/configurations/sensorconfig.json";
//import appconfig from "@/assets/appconfig.json";
// END SAK???
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
      totalRuntime: FACILITY_RUN_SECONDS / 60,
      currentProcessId: 0,
      event: "",
      intervalVar: null,
      sensors: [],
      sensortypes: sensorconfig.sensortypes,
      sensorId: 0,
      issuedcommand: null,
      sensor: {},
      sensorsToPublish: [],
      // sensormessages: [],
      realtimeSensorData: {},
      latestMinuteSensorStats: {},
      realtimeSensorDisplay: [],
      latestMinuteSensorStatsDisplay: [],
      dailySensorStats: {},
      //  dailyStatsDisplay: [],
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
    //  const storedComp = this.$store.getters.getPctComplete;
    // console.log("storedComp: ", storedComp);
    // if (storedComp !== null) {
    //   this.pctComplete = storedComp.pctComplete;
    // }

    const that = this;
    this.generateSensors();

    // When messages are received via IOT, these handlers are triggered
    bus.$on("message", async (message) => {
      // console.log("Home::on::message: ", message);

      if (message.msg === "sensordata") {
        // console.log("Received sensor data message: ", message);
        await that.updateRealtimeSensorData(message.results);
      }

      if (message.msg === "sensorstats") {
        //  console.log("Received sensor stats message: ", message);
        await that.updateSensorStatsByLatestMinute(message.sensorstats);
      }
    });
    bus.$on("stopsimulator", async () => {
      that.stopFacility();
    });

    // bus.$on("sensormessage", async (sensormessage) => {
    //   // console.log("Home::on::sensormessage: ", sensormessage);

    //   // Add to realtime results
    //   if (sensormessage.msg === "sensordata") {
    //     await that.updateRealtimeSensorData(sensormessage.results);
    //   }
    // });

    bus.$on("facilitycommandreceived", async (receivedcommand) => {
      console.log("Home::on::facilitycommand: ", receivedcommand.command);
      await that.executeCommand(receivedcommand);
    });

    bus.$on("facilityconfigrequest", async (receivedconfigrequest) => {
      console.log("Home::on::facilityconfigrequest: ");
      await that.handleConfigurationRequest(receivedconfigrequest);
    });
  },
  methods: {
    generateSensors() {
      console.log("Sensor types: ", this.sensortypes);
      var idCount = 0;
      for (let j = 0; j < this.sensortypes.length; j++) {
        const sensortype = this.sensortypes[j];
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

    // TODO: is this still needed
    resetAll() {
      this.realtimeSensorData = {};
      this.realtimeSensorDisplay = [];
    },

    // When an operator logs in, the operator app sends configuration request:
    async handleConfigurationRequest(receivedconfigrequest) {
      console.log("Facility configuration request:", receivedconfigrequest);
      const facilityconfiguration = {
        totalruntime: FACILITY_RUN_SECONDS,
        currentPctComplete: round(this.pctComplete, 2),
        currentStatus: this.facilitystatus,
      };
      bus.$emit("facilityconfigpublish", facilityconfiguration);
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
              facilityId: facilitystatus.facilityId,
              status: "RUNNING",
            };
            this.$store.dispatch("setFacilityStatus", udpatedFacilityStatus);
            bus.$emit("facilitystatusupdate", udpatedFacilityStatus);
          }
          break;

        case "stop":
          if (
            facilitystatus.status === "RUNNING" ||
            facilitystatus.status === "PAUSED"
          ) {
            // Transition to 'idle' state:
            this.stopFacility();
            // const udpatedFacilityStatus = {
            //   facilityId: facilitystatus.facilityId,
            //   status: "IDLE",
            // };
            // this.$store.dispatch("setFacilityStatus", udpatedFacilityStatus);
            // bus.$emit("facilitystatusupdate", udpatedFacilityStatus);
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
      }
    },
    // Update real-time sensor data panel:
    async updateRealtimeSensorData(sensormessage) {
      let sensorData = JSON.parse(sensormessage);
      let intermediateSensorData = [];

      //  console.log("updateRealtimeSensorData: ", sensorData);

      // Update internal realtime sensor data
      for (let sensorId in sensorData) {
        if (!this.sensors[sensorId]) {
          continue;
        }
        //   console.log("sensor current sensordata update by id: ",this.sensors[sensorId]);
        // this.realtimeSensorData[sensorId] = {
        //   sensorId: sensorId,
        //   name: this.sensors[sensorId].name,
        //   typeId: this.sensors[sensorId].typeId,
        //   sensordata: round(sensorData[sensorId], 2),
        // };

        intermediateSensorData.push({
          sensorId,
          name: this.sensors[sensorId].name,
          typeId: this.sensors[sensorId].typeId,
          sensordata: round(sensorData[sensorId], 2),
        });
      }
      // Convert to array
      // for (let sensorId in this.realtimeSensorData) {
      //   intermediateSensorData.push({
      //     sensorId,
      //     name: this.sensors[sensorId].name,
      //     typeId: this.sensors[sensorId].typeId,
      //     sensordata: round(sensorData[sensorId], 2),
      //   });

      //    console.log("intermediateSensorResults: ", intermediateSensorResults);
      // }

      this.realtimeSensorDisplay = intermediateSensorData;
    },

    async updateDailyStats(dailyStatsData) {
      console.log("updateDailyStats 'dailyStatsData': ", dailyStatsData);
      // console.log("this.dailySensorStats0: ", this.dailySensorStats);

      let intermediateSensorStats = [];

      // console.log("updateDailyStats: ", dailyStats);

      // Update daily sensor stats
      dailyStatsData.map(
        (item) =>
          (this.dailySensorStats[item.sensorId] = {
            sensorId: item.sensorId,
            name: this.sensors[item.sensorId].name,
            min: round(item.min_val, 2),
            max: round(item.max_val, 2),
            median: round(item.median_val, 2),
            ts: item.ts,
          })
      );

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
      // this.event = "update";

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
      // this.event = "update";

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
      // this.event = "update";

      this.issuedcommand = "resume";
      const facilityCommand = {
        command: this.issuedcommand,
        facilityId: 1,
      };

      console.log("Issued resume command: ", facilityCommand);
      bus.$emit("facilitycommandissued", facilityCommand);
    },
    launchFacility() {
      console.log("Start facility");
      this.currentSecond = 540;
      this.currentProcessId = Date.now();
      this.pctComplete = 0;
      this.sensorsToPublish.length = 0;
      this.event = "update";

      this.intervalVar = setInterval(this.nextInterval, 1000);

      // Get daily data every minute:
      this.dailyDataIntervalVar = setInterval(
        this.nextDailyDataInterval,
        30000
      );

      // for (let sensor in this.sensors) {
      this.sensors.forEach((sensor) => {
        this.sensor = new Sensor(sensor);
        {
          console.log("sensor:", sensor);
          console.log("sensorId:", sensor.id);
          console.log("sensorName:", sensor.name);
        }
        this.sensorsToPublish.push(this.sensor);
      });
      //  this.sensormessages = [];
      console.log("this.sensorsToPublish: ", this.sensorsToPublish);
    },

    stopFacility() {
      clearInterval(this.intervalVar);
      clearInterval(this.dailyDataIntervalVar);
      // Facility was stopped, reset current process settings:
      this.pctComplete = 0;
      this.currentSecond = 0;
      this.sensorsToPublish.length = 0;
      const udpatedFacilityStatus = {
        facilityId: this.$store.getters.facilityStatus.facilityId,
        status: "IDLE",
      };
      this.$store.dispatch("setFacilityStatus", udpatedFacilityStatus);

      this.$store.dispatch("setPctComplete", this.pctComplete);
      this.$store.dispatch("setDailySenorStats", []);
      bus.$emit("facilitystatusupdate", udpatedFacilityStatus);
      console.log("Facility was stopped");
    },
    pauseFacility() {
      clearInterval(this.intervalVar);
      clearInterval(this.dailyDataIntervalVar);
      // Facility was paused, reset current process settings:
      console.log("Facility was paused");
    },
    resumeFacility() {
      this.intervalVar = setInterval(this.nextInterval, 1000);

      // SAK???
      // Get daily data every minute:
      this.dailyDataIntervalVar = setInterval(
        this.nextDailyDataInterval,
        30000
      );
      // Facility was paused reset current process settings:
      console.log("Facility was paused");
    },

    async nextDailyDataInterval() {
      console.log("nextDailyDataInterval() was called");
      // Facility is stopped
      if (this.currentSecond > FACILITY_RUN_SECONDS) return;
      if (this.currentSecond === FACILITY_RUN_SECONDS) {
        clearInterval(this.dailyDataIntervalVar);
      }
      const URL = `${this.$store.getters.appConfiguration.APIendpoint}/dailyStats?facilityId=1`;
      // console.log("Getting daily data at: ", URL);
      // console.log(
      //   "Session token: ", this.$store.getters.authCredentials.sessionToken
      // Vue.prototype.$appConfig.credentials.sessionToken
      //);
      var response;
      try {
        response = await axios.get(URL, {
          headers: {
            Authorization: this.$store.getters.authCredentials.sessionToken,
          },
        });
        //   console.log("Got response for daily data: ", response);
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

    async nextInterval() {
      if (this.currentSecond > FACILITY_RUN_SECONDS) return;
      // console.log(`Second ${this.currentSecond} of ${FACILITY_RUN_SECONDS}`);
      // Interval step
      this.pctComplete = round(
        (this.currentSecond / FACILITY_RUN_SECONDS) * 100,
        2
      );

      // console.log("this.pctComplete1:", this.pctComplete);
      // console.log("this.currentSecond:", this.currentSecond);

      // for (let sensor in this.sensorsToPublish) {
      this.sensorsToPublish.forEach((sensor) => {
        //   console.log("sensor to publish: ", sensor);
        // Publish the sensor's current value
        const sensorData = simulateSensorData(1, 100);
        // console.log("sensordata: ", sensorData);
        // console.log("sensor name: ", this.sensors[sensor]);
        const sensormessage = {
          uuid: uuidv4(),
          event: this.event,
          deviceTimestamp: Date.now(),
          second: this.currentSecond,
          name: sensor.name,
          sensorId: sensor.id,
          processId: this.currentProcessId,
          facilityId: 1,
          sensorData: sensorData,
        };

        bus.$emit("sensorpublish", sensormessage);
      });

      if (this.currentSecond === FACILITY_RUN_SECONDS) {
        clearInterval(this.intervalVar);
        clearInterval(this.dailyDataIntervalVar);
        const udpatedFacilityStatus = {
          facilityId: this.$store.getters.facilityStatus.facilityId,
          status: "COMPLETE",
        };

        // TODO: move updating of facility status and pctcomplete into a separate function
        this.$store.dispatch("setFacilityStatus", udpatedFacilityStatus);
        this.$store.dispatch("setPctComplete", this.pctComplete);
        //  console.log("pctComplete: ", this.pctComplete);
        bus.$emit("updatepercentcomplete", {
          facilityid: 1,
          pctcomplete: round(this.pctComplete, 2),
        });
        bus.$emit("facilitystatusupdate", udpatedFacilityStatus);

        // Finally, check if the process is complete then send
        // the last message for this process with event status as "complete":
        if (this.currentSecond === FACILITY_RUN_SECONDS) {
          this.event = "complete";
          const sensormessage = {
            uuid: uuidv4(),
            event: this.event,
            deviceTimestamp: Date.now(),
            second: this.currentSecond,
            processId: this.currentProcessId,
            facilityId: 1,
          };
          bus.$emit("sensorpublish", sensormessage);
        }

        return;
      }

      this.$store.dispatch("setPctComplete", this.pctComplete);
      bus.$emit("updatepercentcomplete", {
        facilityid: 1,
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

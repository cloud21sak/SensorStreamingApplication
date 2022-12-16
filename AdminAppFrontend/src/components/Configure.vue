<template>
  <v-container fluid>
    <v-layout text-center wrap>
      <v-flex mb-4>
        <h1 class="display-2 font-weight-bold mb-3">
          Configure sensors for facility
        </h1>
      </v-flex>
    </v-layout>
    <v-spacer></v-spacer>
    <v-row align="center" justify="center">
      <v-col cols="12" md="2">
        <v-card>
          <v-card-title>Sensor type</v-card-title>
          <v-card-text class="display-2">
            <v-text-field v-model="selectedSensortype.name" readonly>
            </v-text-field>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="2">
        <v-card>
          <v-card-title>Min value</v-card-title>
          <v-card-text class="display-1">
            <v-text-field
              v-model="selectedSensortype.minval"
              @change="onConfigChange()"
            ></v-text-field>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="2">
        <v-card>
          <v-card-title>Max value</v-card-title>
          <v-card-text class="display-2">
            <v-text-field
              v-model="selectedSensortype.maxval"
              @change="onConfigChange()"
            ></v-text-field>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="2">
        <v-card>
          <v-card-title>Total number</v-card-title>
          <v-card-text class="display-2">
            <v-text-field
              v-model="selectedSensortype.totalnumber"
              @change="onConfigChange()"
            ></v-text-field>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="1">
        <v-btn
          color="primary"
          :disabled="!isConfigChanged"
          elevation="2"
          @click="onSaveSensorConfiguration()"
          >Save</v-btn
        >
      </v-col>
    </v-row>
    <v-row class="justify-center">
      <v-col cols="12" md="8">
        <v-card>
          <v-card-title class="justify-center"
            >Configured facility sensors</v-card-title
          >
          <v-data-table
            :headers="sensorConfigHeaders"
            :items="sensortypeConfigurationsDisplay"
            :items-per-page="5"
            class="elevation-1"
            :multi-sort="true"
            @click:row="selectSensorTypeRow"
          >
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import axios from "axios";
import sensorconfig from "@/configurations/sensorconfig.json";

// Libraries
// const Sensor = require("@/lib/sensor");
import appStore from "../store";

export default {
  name: "Configure",
  computed: {
    sensortypeConfigurationsDisplay() {
      return this.$store.getters.configuredSensorTypes;
    },
  },
  data() {
    return {
      sensorConfigHeaders: [
        { text: "Sensor type", value: "name" },
        { text: "Min value", value: "minval" },
        { text: "Max value", value: "maxval" },
        { text: "Total number", value: "totalnumber" },
      ],
      selectedSensortype: {},
      sensortypeConfigurations: [],
      isConfigChanged: false,
    };
  },
  beforeRouteEnter(to, from, next) {
    console.log("Store instance: ", appStore);

    if (!appStore.getters.isAuthenticated) {
      next("/login");
    } else {
      console.log("Configure Component, user authenticated!");
      next(true);
    }
  },
  async created() {
    console.log("Configure component: created() hook called");

    // Check if sensor type configurations is not set in the store,
    // then set it to the default settings:
    if (this.$store.getters.configuredSensorTypes.length === 0) {
      console.log(
        "No confgirued sensor types in the store, using default configuration"
      );
      sensorconfig.sensortypes.map((sensorType) => {
        this.sensortypeConfigurations.push(sensorType);
      });
    } else {
      // Note that this.$store.getters.configuredSensorTypes should already be set
      // since it gets initialized in Home.vue component:
      this.$store.getters.configuredSensorTypes.map((sensorType) => {
        this.sensortypeConfigurations.push(sensorType);
      });
    }

    this.selectedSensortype = {
      typeId: this.sensortypeConfigurations[0].typeId,
      name: this.sensortypeConfigurations[0].name,
      minval: this.sensortypeConfigurations[0].minval,
      maxval: this.sensortypeConfigurations[0].maxval,
      totalnumber: this.sensortypeConfigurations[0].totalnumber,
    };
    console.log(" this.selectedSensortype:", this.selectedSensortype);
  },

  methods: {
    selectSensorTypeRow(event) {
      console.log("Selected row: ", event);
      //  console.log("sensorconfig.sensortypes before:", sensorconfig.sensortypes);
      console.log(
        "this.sensortypeConfigurations before:",
        this.sensortypeConfigurations
      );
      // Initialize the change state to false for each selection:
      this.isConfigChanged = false;

      this.selectedSensortype.typeId = event.typeId;
      this.selectedSensortype.name = event.name;
      this.selectedSensortype.minval = event.minval;
      this.selectedSensortype.maxval = event.maxval;
      this.selectedSensortype.totalnumber = event.totalnumber;
      console.log(
        "this.sensortypeConfigurations after:",
        this.sensortypeConfigurations
      );
    },
    onSaveSensorConfiguration() {
      console.log("save selected sensor type :", this.selectedSensortype);

      console.log("this.sensortypeConfigurations mapping:");
      this.sensortypeConfigurations.map((x, i) => {
        console.log(`x: ${x} i: ${i}`);
      });

      let filteredValue = this.sensortypeConfigurations
        .map((x, i) => [i, x])
        .filter((x) => x[1].typeId == this.selectedSensortype.typeId);
      console.log("fileterdValue: ", filteredValue);

      this.sensortypeConfigurations[
        this.sensortypeConfigurations
          .map((x, i) => [i, x])
          .filter((x) => x[1].typeId == this.selectedSensortype.typeId)[0][0]
      ] = {
        typeId: this.selectedSensortype.typeId,
        name: this.selectedSensortype.name,
        minval: this.selectedSensortype.minval,
        maxval: this.selectedSensortype.maxval,
        totalnumber: this.selectedSensortype.totalnumber,
      };

      console.log(
        "updated this.sensortypeConfigurations:",
        this.sensortypeConfigurations
      );

      let result = this.updateSensorConfiguration();
      this.$store.dispatch(
        "setConfiguredSensorTypes",
        this.sensortypeConfigurations
      );
      console.log("Saved sensor configuration status: ", result);
      console.log(
        "this.sensortypeConfigurationsDisplay",
        this.sensortypeConfigurationsDisplay
      );
      this.isConfigChanged = false;
    },
    async updateSensorConfiguration() {
      // Store sensor configurations for the facility in the database:
      try {
        const urlPostConfig = `${this.$store.getters.appConfiguration.APIendpoint}/savefacilitysensorconfig?facilityId=${sensorconfig.facilityId}`;

        const userSession = this.$store.getters.userSession;
        const response = await axios.post(
          urlPostConfig,
          {
            payload: {
              sensortypes: this.sensortypeConfigurations,
            },
          },
          {
            headers: {
              Authorization: userSession.getIdToken().getJwtToken(),
            },
          }
        );

        console.log("response after post: ", response);
        return response.status;
      } catch (err) {
        console.log("error saving sensor configuration:", err);
        return err.message;
      }
    },
    async onConfigChange() {
      console.log("Sensor config value changed");
      this.isConfigChanged = true;
    },
  },
};
</script>

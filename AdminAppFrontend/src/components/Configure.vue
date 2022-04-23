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
            <v-text-field v-model="selectedSensortype.minval"></v-text-field>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="2">
        <v-card>
          <v-card-title>Max value</v-card-title>
          <v-card-text class="display-2">
            <v-text-field v-model="selectedSensortype.maxval"></v-text-field>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="2">
        <v-card>
          <v-card-title>Total number</v-card-title>
          <v-card-text class="display-2">
            <v-text-field
              v-model="selectedSensortype.totalnumber"
            ></v-text-field>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="1">
        <!-- <v-card>
          <v-card-actions> -->
        <v-btn
          color="primary"
          elevation="2"
          @click="onSaveSensorConfiguration()"
          >Save</v-btn
        >
        <!-- </v-card-actions>
        </v-card> -->
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
            :items="sensortypeConfigurations"
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
// import appStore from "../store";

export default {
  name: "Configure",
  // computed: {
  //   selectedSensortypeToEdit() {
  //     return this.selectedSensortype;
  //   },
  // },
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
    };
  },

  async created() {
    console.log("Configure component: created() hook called");
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
      console.log("Getting daily data errror: ", err.message);
    }

    sensorconfig.sensortypes.map((sensortype) => {
      this.sensortypeConfigurations.push(sensortype);
    });

    console.log(
      "this.sensortypeConfigurations: ",
      this.sensortypeConfigurations
    );
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
    getSensorConfiguration() {
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
    selectSensorTypeRow(event) {
      console.log("Selected row: ", event);
      console.log("sensorconfig.sensortypes before:", sensorconfig.sensortypes);
      console.log(
        "this.sensortypeConfigurations before:",
        this.sensortypeConfigurations
      );
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

      console.log("sensorconfig.sensortypes mapping:");
      sensorconfig.sensortypes.map((x, i) => {
        console.log(`x: ${x} i: ${i}`);
      });

      let filteredValue = sensorconfig.sensortypes
        .map((x, i) => [i, x])
        .filter((x) => x[1].typeId == this.selectedSensortype.typeId);
      console.log("fileterdValue: ", filteredValue);

      sensorconfig.sensortypes[
        sensorconfig.sensortypes
          .map((x, i) => [i, x])
          .filter((x) => x[1].typeId == this.selectedSensortype.typeId)[0][0]
      ] = this.selectedSensortype;
      console.log(
        "updated sensorconfig.sensortypes:",
        sensorconfig.sensortypes
      );

      this.sensortypeConfigurations = [];
      sensorconfig.sensortypes.map((sensortype) => {
        this.sensortypeConfigurations.push(sensortype);
      });

      let result = this.updateSensorConfiguration();
      console.log("Saved sensor configuration status: ", result);
    },
    async updateSensorConfiguration() {
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
        return response.status;
      } catch (err) {
        console.log("error saving sensor configuration:", err);
        return err.message;
      }
    },
  },
};
</script>

<template>
  <v-container fluid>
    <v-layout text-center wrap>
      <v-flex xs12>
        <v-img
          :src="require('../assets/sensorlogo.svg')"
          class="my-3"
          contain
          height="200"
        ></v-img>
      </v-flex>
      <v-flex mb-4>
        <h1 class="display-2 font-weight-bold mb-3">
          This application demonstrates serverless architecture for streaming
          sensor data in AWS
        </h1>
        <p class="subheading font-weight-regular">
          Please login to start working with the app
        </p>
      </v-flex>
    </v-layout>
  </v-container>
</template>

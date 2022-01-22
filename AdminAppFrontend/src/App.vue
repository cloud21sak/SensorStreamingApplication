<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <v-toolbar-title> ACME Industries Inc </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-toolbar-title>Sensor Configuration and Data Dashboard</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn
        v-model="isLoggedIn"
        v-if="!isLoggedIn"
        key="Welcome"
        color="white"
        text
        rounded
        to="/welcome"
      >
        Welcome
      </v-btn>
      <v-btn
        v-model="isLoggedIn"
        v-if="isLoggedIn"
        key="Home"
        color="white"
        text
        rounded
        to="/home"
      >
        Dashboard
      </v-btn>
      <v-btn
        v-model="isLoggedIn"
        v-if="!isLoggedIn"
        key="Login"
        color="white"
        text
        rounded
        to="/login"
      >
        Login
      </v-btn>
      <v-btn
        v-model="isLoggedIn"
        v-if="isLoggedIn"
        key="Logout"
        color="white"
        text
        rounded
        @click="onLogout"
        to="/login"
      >
        Logout
      </v-btn>
    </v-app-bar>
    <v-main>
      <router-view></router-view>
    </v-main>
  </v-app>
</template>

<script>
import { bus } from "./main";
import appStore from "./store";

export default {
  name: "App",
  computed: {
    facilitystatus() {
      return this.$store.getters.facilityStatus;
    },
    isLoggedIn() {
      console.log("Authenticated:", this.isAuthenticated);
      return appStore.getters.isAuthenticated;
    },
  },
  methods: {
    onLogout() {
      const userPool = this.$store.getters.userPool;
      var cognitoUser = userPool.getCurrentUser();
      cognitoUser.signOut();
      console.log("isAuthenticated#1:", appStore.getters.isAuthenticated);
      console.log("isAuthenticated data1: ", this.isAuthenticated);

      this.$store.dispatch("logout");
      console.log("isAuthenticated#2:", appStore.getters.isAuthenticated);
      console.log("isAuthenticated data2: ", this.isAuthenticated);
      bus.$emit("stopsimulator");
    },
  },
  data: () => ({
    showPassword: false,
    isAuthenticated: appStore.getters.isAuthenticated,
    links: [
      {
        label: "Home",
        url: "/home",
        loggedIn: "isLoggedIn",
      },
      {
        label: "Login",
        url: "/login",
        loggedIn: "!isLoggedIn",
      },
      {
        label: "Logout",
        url: "/login",
        loggedIn: "false",
      },
    ],
  }),
};
</script>

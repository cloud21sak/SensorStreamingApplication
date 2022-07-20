import Vue from "vue";
import Vuex from "vuex";
//import router from "./router";

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    idToken: null,
    userPool: null,
    userId: null,
    user: null,
    facilitystatus: {
      facilityId: null,
      status: "OFFLINE",
    },
    isAuthenticated: false,
    authcredentials: {},
    appconfiguration: {},
    pctComplete: 0,
    currentProcessId: 0,
    dailySensorStats: [],
    completedProcessInfo: {
      selectedProcessId: null,
      completedProcessStats: [],
    },
    // configuredSensorTypes: [],
    sensorInstances: [],
  },
  getters: {
    userToken: (state) => {
      return state.idToken;
    },
    userPool: (state) => {
      return state.userPool;
    },
    facilityStatus: (state) => {
      return state.facilitystatus;
    },
    appConfiguration: (state) => {
      return state.appconfiguration;
    },
    authCredentials: (state) => {
      return state.authcredentials;
    },
    isAuthenticated: (state) => {
      return state.isAuthenticated;
    },
    getPctComplete: (state) => {
      return state.pctComplete;
    },
    getCurrentProcessId: (state) => {
      return state.currentProcessId;
    },
    dailySensorStats: (state) => {
      return state.dailySensorStats;
    },
    completedProcessInfo: (state) => {
      return state.completedProcessInfo;
    },
    sensorInstances: (state) => {
      return state.sensorInstances;
    },
  },
  mutations: {
    updateAppConfiguration(state, appconfiguration) {
      state.appconfiguration = appconfiguration;
      console.log("App configuration was set:", state.appconfiguration);
    },
    updateSensorInstances(state, sensorInstances) {
      state.sensorInstances = sensorInstances;
    },
    updateFacilityStatus(state, facilityStatus) {
      state.facilitystatus = facilityStatus;
      console.log("Facility status updated:", state.facilitystatus);
    },
    updateAuthCredentials(state, authCredentials) {
      state.authcredentials = authCredentials;
      console.log("Set authcredentials:", authCredentials);
    },
    updateAuthStatus(state, authStatus) {
      state.isAuthenticated = authStatus;
    },
    updateUserPool(state, userPool) {
      state.userPool = userPool;
    },
    clearAuthData(state) {
      state.idToken = null;
      state.userId = null;
      state.isAuthenticated = false;
      state.authcredentials = {};
    },
    resetState(state) {
      state.facilitystatus.facilityId = null;
      state.facilitystatus.status = "OFFLINE";
      state.pctComplete = 0;
      state.currentProcessId = 0;
      state.dailySensorStats = [];
      state.completedProcessInfo.selectedProcessId = null;
      state.completedProcessInfo.completedProcessStats = [];
      state.sensorInstances = [];
    },
    updatePctComplete(state, pctComplete) {
      state.pctComplete = pctComplete;
    },
    updateCurrentProcessId(state, currentProcessId) {
      state.currentProcessId = currentProcessId;
    },
    updateDailySensorStats(state, dailySensorStats) {
      state.dailySensorStats = dailySensorStats;
    },
    updateCompletedProcessInfo(state, completedProcessInfo) {
      state.completedProcessInfo = completedProcessInfo;
    },
  },
  actions: {
    setFacilityStatus({ commit }, facilityStatus) {
      commit("updateFacilityStatus", facilityStatus);
    },
    setSensorInstances({ commit }, sensorInstances) {
      commit("updateSensorInstances", sensorInstances);
    },
    setAppConfiguration({ commit }, appconfig) {
      commit("updateAppConfiguration", appconfig);
    },
    setAuthCredentials({ commit }, authCredentials) {
      commit("updateAuthCredentials", authCredentials);
    },
    setAuthenticationStatus({ commit }, authStatus) {
      commit("updateAuthStatus", authStatus);
    },
    storeUserPool({ commit }, userPool) {
      commit("updateUserPool", userPool);
    },
    logout({ commit }) {
      commit("clearAuthData");
      commit("resetState");
      // router.replace("/login");
    },
    setPctComplete({ commit }, pctComplete) {
      commit("updatePctComplete", pctComplete);
    },
    setCurrentProcessId({ commit }, currentProcessId) {
      commit("updateCurrentProcessId", currentProcessId);
    },
    setDailySenorStats({ commit }, dailySensorStats) {
      commit("updateDailySensorStats", dailySensorStats);
    },
    setCompletedProcessInfo({ commit }, completedProcessInfo) {
      commit("updateCompletedProcessInfo", completedProcessInfo);
    },
  },
});

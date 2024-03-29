import Vue from "vue";
import Vuex from "vuex";

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    idToken: null,
    userPool: null,
    userSession: null,
    userId: null,
    user: null,
    facilitystatus: {
      facilityId: 1,
      status: "IDLE",
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
    configuredSensorTypes: [],
    sensorInstances: [],
  },
  getters: {
    userToken: (state) => {
      return state.idToken;
    },
    userPool: (state) => {
      return state.userPool;
    },
    userSession: (state) => {
      return state.userSession;
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
    configuredSensorTypes: (state) => {
      return state.configuredSensorTypes;
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
    updateUserSession(state, userSession) {
      state.userSession = userSession;
    },
    clearAuthData(state) {
      state.idToken = null;
      state.userId = null;
      state.userPool = null;
      state.user = null;
      state.isAuthenticated = false;
      state.authcredentials = {};
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
    updateConfiguredSensorTypes(state, configuredSensorTypes) {
      state.configuredSensorTypes = [];
      configuredSensorTypes.map((sensorType) => {
        state.configuredSensorTypes.push(sensorType);
      });
    },
    updateGeneratedSensorInstances(state, generatedSensors) {
      state.sensorInstances = generatedSensors;
    },
  },
  actions: {
    setFacilityStatus({ commit }, facilityStatus) {
      commit("updateFacilityStatus", facilityStatus);
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
    storeUserSession({ commit }, userSession) {
      commit("updateUserSession", userSession);
    },
    logout({ commit }) {
      commit("clearAuthData");
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
    setConfiguredSensorTypes({ commit }, configuredSensorTypes) {
      commit("updateConfiguredSensorTypes", configuredSensorTypes);

      // Generate sensor instances based on updated sensor type configurations:
      console.log("this.state:", this.state);
      let sensorTypeConfigurations = this.state.configuredSensorTypes;
      // console.log("Sensor types: ", this.sensortypes);
      console.log("Sensor types: ", sensorTypeConfigurations);
      var idCount = 0;
      let sensors = [];
      for (let j = 0; j < sensorTypeConfigurations.length; j++) {
        const sensortype = sensorTypeConfigurations[j];
        for (let i = 0; i < sensortype.totalnumber; i++) {
          const sensorObj = {
            id: idCount++,
            name: sensortype.name + "_" + i,
            typeId: sensortype.typeId,
            minval: sensortype.minval,
            maxval: sensortype.maxval,
          };
          // console.log("sensorObj: ", sensorObj);
          sensors.push(sensorObj);
        }
      }
      console.log("Generated sensors: ", sensors);
      commit("updateGeneratedSensorInstances", sensors);
    },
  },
});

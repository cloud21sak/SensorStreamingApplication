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
      status: "IDLE",
    },
    isAuthenticated: false,
    authcredentials: {},
    appconfiguration: {},
    pctComplete: 0,
    dailySensorStats: [],
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
    dailySensorStats: (state) => {
      return state.dailySensorStats;
    },
  },
  mutations: {
    //       userTokenUpdate: (state, payload) => {
    //           state.idToken = payload;
    //       }
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
    clearAuthData(state) {
      state.idToken = null;
      state.userId = null;
      state.isAuthenticated = false;
      state.authcredentials = {};
    },
    updatePctComplete(state, pctComplete) {
      state.pctComplete = pctComplete;
    },
    updateDailySensorStats(state, dailySensorStats) {
      state.dailySensorStats = dailySensorStats;
    },
  },
  actions: {
    //       updateUserToken(context, payload) => {
    //           context.dispatch()
    //       }

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
    logout({ commit }) {
      commit("clearAuthData");
      // router.replace("/login");
    },
    setPctComplete({ commit }, pctComplete) {
      commit("updatePctComplete", pctComplete);
    },
    setDailySenorStats({ commit }, dailySensorStats) {
      commit("updateDailySensorStats", dailySensorStats);
    },
  },
});

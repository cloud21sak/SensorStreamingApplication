import Vue from "vue";
import App from "./App.vue";

import IoT from "@/components/IoT";
import vuetify from "./plugins/vuetify";
import router from "./router";
import store from "./store";

Vue.config.productionTip = false;

// Realtime websocket notifications
Vue.component("iot", IoT);

Vue.prototype.$appName = "Sensordata";

export const bus = new Vue();

new Vue({
  vuetify,
  router,
  store,
  render: (h) => h(App),
}).$mount("#app");

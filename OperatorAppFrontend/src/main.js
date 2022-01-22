import Vue from "vue";
import App from "./App.vue";

import IoT from "@/components/IoT";
import vuetify from "./plugins/vuetify";
import router from "./router";
import store from "./store";

Vue.config.productionTip = false;

// Realtime websocket notifications
Vue.component("iot", IoT);

/* ===================================================
                      CONFIGURATION
    You must add your own values here! See the tutorial
    in the GitHub repo for more information. @jbesw
   =================================================== */

//Vue.config.productionTip = false;
Vue.prototype.$appName = "Sensordata";
//Vue.prototype.$appStore = store;

// ** Websocket connection **

//  PoolId: Retrieve this with the CLI command:
//          aws cognito-identity list-identity-pools --max-results 10 --region REGION_CODE

//  Host: Retrieve this with the CLI command:
//          aws iot describe-endpoint --endpoint-type iot:Data-ATS --region REGION_CODE

// Vue.prototype.$appConfig = {
//   isAuthenticated: false,
//   poolId: "us-east-1:1f7888e2-1b8e-4757-834e-55da6359858b", // 'CognitoIdentityPoolId', e.g. 'us-east-1:1f7888e2-1b8e-4757-834e-55da6359858b'
//   host: "a14v16bxk6qigt-ats.iot.us-east-1.amazonaws.com", // 'AwsIoTEndpoint', e.g. 'prefix.iot.us-east-1.amazonaws.com'
//   region: "us-east-1", // Your region, e.g. us-west-2
//   historyBucket: "sensordata-history-bucket-sak", // Your history bucket name (not ARN)
//   APIendpoint: "https://8emsu9sr09.execute-api.us-east-1.amazonaws.com", // e.g. 'https://1234abcd123.execute-api.us-east-2.amazonaws.com'
// };

export const bus = new Vue();

new Vue({
  vuetify,
  router,
  store,
  render: (h) => h(App),
}).$mount("#app");
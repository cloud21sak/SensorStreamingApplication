import Vue from "vue";

import VueRouter from "vue-router";
import HomePage from "./components/Home.vue";
import Login from "./components/Login.vue";
import WelcomePage from "./components/Welcome.vue";
import NotFound from "./components/NotFound.vue";

Vue.use(VueRouter);

const routes = [
  { path: "/home", name: "Home", component: HomePage },
  { path: "/login", name: "Login", component: Login },
  { path: "/", name: "Welcome", component: WelcomePage },
  { path: "/welcome", name: "Welcome", component: WelcomePage },
  { path: "/:notFound(.*)", component: NotFound },
];

export default new VueRouter({ mode: "history", routes });

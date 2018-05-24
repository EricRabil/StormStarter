// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import "babel-polyfill";
import { Authenticator } from './sdk/Authenticator';
import Vue from 'vue'
import App from './App'
import router from './router'
import * as util from './sdk/Util';
import { API_V0, ERROR_CODES } from "../Constants";

Vue.config.productionTip = false

/* eslint-disable no-new */
new Vue({
  el: '#app',
  router,
  components: { App },
  render: h => h(App)
})

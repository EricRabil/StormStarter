import Vue from 'vue'
import Router from 'vue-router'
import Authentication from '../components/Authentication'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'Authentication',
      component: Authentication
    }
  ]
})

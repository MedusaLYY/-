import { createRouter, createWebHashHistory } from 'vue-router'
import MonitorView from '../views/MonitorView.vue'

const routes = [
  { path: '/', redirect: '/monitor' },
  { path: '/monitor', name: 'monitor', component: MonitorView, meta: { title: '监测总览' } },
  {
    // 航线规划页内嵌 Leaflet 预览地图，懒加载，避免 leaflet 进监测总览首屏
    path: '/routes',
    name: 'routes',
    component: () => import('../views/RoutesView.vue'),
    meta: { title: '航线规划' },
  },
  {
    path: '/tasks',
    name: 'tasks',
    component: () => import('../views/TasksView.vue'),
    meta: { title: '任务执行' },
  },
  {
    path: '/data',
    name: 'data',
    component: () => import('../views/DataView.vue'),
    meta: { title: '数据管理' },
  },
  {
    // 含 Leaflet 预览地图，懒加载
    path: '/airspace',
    name: 'airspace',
    component: () => import('../views/AirspaceView.vue'),
    meta: { title: '空域管理' },
  },
  {
    path: '/evidence',
    name: 'evidence',
    component: () => import('../views/EvidenceView.vue'),
    meta: { title: '取证存证' },
  },
  {
    // 统计分析页用到 ECharts，改成懒加载，避免把 500KB+ 的图表库打进监测总览首屏
    path: '/stat',
    name: 'stat',
    component: () => import('../views/StatView.vue'),
    meta: { title: '统计分析' },
  },
  { path: '/:pathMatch(.*)*', redirect: '/monitor' },
]

export default createRouter({
  history: createWebHashHistory(),
  routes,
})

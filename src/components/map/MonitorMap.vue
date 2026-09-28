<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import { useLeafletMap } from '../../composables/useLeafletMap'
import { useMonitorStore } from '../../stores/monitor'
import { droneIcon, eventIcon, returnPointIcon } from '../../utils/mapIcons'
import {
  AIRSPACE_CATEGORY_DASH,
  AIRSPACE_CATEGORY_LABEL,
  AIRSPACE_LEVEL_LABEL,
  DETOUR_COLOR,
  EVENT_TYPE_COLOR,
  OBSTACLE_TYPE_LABEL,
  RETURN_MODE_LABEL,
} from '../../domain/constants'
import MapLegend from './MapLegend.vue'

const store = useMonitorStore()

const containerRef = ref(null)

const { map, ready, tileFailed, layerGroups, invalidate } = useLeafletMap(containerRef)

/** 已飞航段 / 未飞航段按任务进度拆分，让航线有「执行到哪了」的信息 */
function splitByProgress(path, progress) {
  const flownCount = Math.min(path.length, Math.max(2, Math.round((path.length * progress) / 100)))
  return {
    flown: path.slice(0, flownCount),
    remaining: path.slice(flownCount - 1),
  }
}

function toLatLngs(lngLatList) {
  return lngLatList.map(([lng, lat]) => [lat, lng])
}

/* ---------------- 空域围栏 ---------------- */
function renderAirspaces() {
  const group = layerGroups.airspaces
  if (!group) return
  group.clearLayers()
  if (!store.layers.airspaces) return

  store.mapAirspaces.forEach((item) => {
    const heightText =
      item.altitudeLimit === 0 ? '全高度禁飞' : `${item.altitudeFloor}~${item.altitudeLimit} 米`

    L.polygon(toLatLngs(item.polygon), {
      color: item.color,
      weight: 1.2,
      opacity: 0.7,
      dashArray: AIRSPACE_CATEGORY_DASH[item.category] || undefined,
      fillColor: item.color,
      fillOpacity: 0.05,
      interactive: true,
    })
      .bindTooltip(
        `<b>${item.name}</b><br/>${AIRSPACE_CATEGORY_LABEL[item.category]} · ${
          AIRSPACE_LEVEL_LABEL[item.level]
        }<br/>高度区间 ${heightText}<br/>${item.owner}`,
        { className: 'map-tip', sticky: true }
      )
      .addTo(group)
  })
}

/* ---------------- 交通航区 ---------------- */
function renderTrafficZones() {
  const group = layerGroups.trafficZones
  if (!group) return
  group.clearLayers()
  if (!store.layers.trafficZones) return

  store.mapTrafficZones.forEach((zone) => {
    L.polygon(toLatLngs(zone.polygon), {
      color: zone.color,
      weight: 1.4,
      opacity: 0.75,
      dashArray: '6 4',
      fillColor: zone.color,
      fillOpacity: 0.06,
      interactive: true,
    })
      .bindTooltip(
        `<b>${zone.name}</b><br/>${zone.remark}<br/>高度上限 ${zone.altitudeLimit} 米`,
        { className: 'map-tip', sticky: true }
      )
      .addTo(group)
  })
}

/* ---------------- 任务区域 ---------------- */
function renderMissionAreas() {
  const group = layerGroups.missionAreas
  if (!group) return
  group.clearLayers()
  if (!store.layers.missionAreas) return

  const focusedId = store.focusedTask?.id

  store.mapMissionAreas.forEach((area) => {
    const focused = area.taskId === focusedId
    const polygon = L.polygon(toLatLngs(area.polygon), {
      color: area.color,
      weight: focused ? 2 : 1.4,
      opacity: focused ? 0.95 : 0.6,
      fillColor: area.color,
      fillOpacity: focused ? 0.14 : 0.07,
      interactive: true,
    })
      .bindTooltip(
        `<b>${area.name}</b><br/>${area.taskName}<br/>面积约 ${area.areaKm2} km² · 限高 ${area.altitudeLimit} 米`,
        { className: 'map-tip', sticky: true }
      )
      .addTo(group)

    if (focused) {
      polygon.bringToFront()
    }
  })
}

/* ---------------- 航线 ---------------- */
function renderRoutes() {
  const group = layerGroups.routes
  if (!group) return
  group.clearLayers()
  if (!store.layers.routes) return

  const focusedId = store.focusedTask?.id

  store.mapRoutes.forEach((route) => {
    const task = store.tasks.find((item) => item.routeId === route.id)
    if (!task) return
    const focused = task.id === focusedId
    const progress = task.progress
    const { flown, remaining } = splitByProgress(route.path, progress)

    // 未飞航段：细虚线，弱化
    L.polyline(toLatLngs(remaining), {
      color: route.color,
      weight: focused ? 2 : 1.6,
      opacity: focused ? 0.4 : 0.26,
      dashArray: '4 5',
      interactive: false,
    }).addTo(group)

    // 已飞航段：实线，强调
    const flownLine = L.polyline(toLatLngs(flown), {
      color: route.color,
      weight: focused ? 3.2 : 2.2,
      opacity: focused ? 0.95 : 0.6,
      lineCap: 'round',
      lineJoin: 'round',
      interactive: true,
    })
      .bindTooltip(
        `<b>${route.name}</b><br/>${task.code} · ${task.name}<br/>` +
          `${route.distanceKm} 公里 · ${route.durationMin} 分钟 · 进度 ${progress}%`,
        { className: 'map-tip', sticky: true }
      )
      .addTo(group)

    if (focused) {
      flownLine.bringToFront()
      // 起终点标记只在聚焦航线上画，避免全局堆叠
      L.circleMarker(toLatLngs([route.path[0]])[0], {
        radius: 4,
        color: route.color,
        weight: 2,
        fillColor: '#fff',
        fillOpacity: 1,
        interactive: false,
      }).addTo(group)
      L.circleMarker(toLatLngs([route.path[route.path.length - 1]])[0], {
        radius: 4,
        color: route.color,
        weight: 2,
        fillColor: route.color,
        fillOpacity: 1,
        interactive: false,
      }).addTo(group)

      // 避障绕行段：橙色虚线画在航线之上
      route.detourSegments.forEach((segment) => {
        L.polyline(toLatLngs(segment.points), {
          color: DETOUR_COLOR,
          weight: 2.6,
          opacity: 0.9,
          dashArray: '7 5',
          lineCap: 'round',
          interactive: true,
        })
          .bindTooltip(
            `<b>避障绕行</b><br/>障碍：${OBSTACLE_TYPE_LABEL[segment.reason]}<br/>` +
              `绕行抬升 ${segment.altitudeDelta} 米 · 安全间距 ${route.obstacleClearanceM} 米`,
            { className: 'map-tip', sticky: true }
          )
          .addTo(group)

        segment.points.forEach((point, index) => {
          if (index === 0 || index === segment.points.length - 1) return
          L.circleMarker(toLatLngs([point])[0], {
            radius: 3,
            color: '#fff',
            weight: 1.5,
            fillColor: DETOUR_COLOR,
            fillOpacity: 1,
            interactive: false,
          }).addTo(group)
        })
      })

      // 返航点：同样只在聚焦航线上画
      L.marker(toLatLngs([route.returnPoint])[0], {
        icon: returnPointIcon({ color: route.color, focused: true }),
        interactive: true,
        zIndexOffset: 500,
      })
        .bindTooltip(
          `<b>返航点</b> ${route.returnPointName}<br/>${RETURN_MODE_LABEL[route.returnMode]} · ` +
            `返航高度 ${route.rtlAltitude} 米 · 触发电量 ${route.returnBatteryThreshold}%`,
          { className: 'map-tip', direction: 'top', offset: [0, -10] }
        )
        .addTo(group)
    }
  })
}

/* ---------------- 无人机 ---------------- */
function renderDrones() {
  const group = layerGroups.drones
  if (!group) return
  group.clearLayers()
  if (!store.layers.drones) return

  const focusedTaskId = store.focusedTask?.id

  store.mapDrones.forEach((drone) => {
    const task = store.taskById(drone.taskId)
    const route = task ? store.routeById(task.routeId) : null
    const focused = task && task.id === focusedTaskId

    const marker = L.marker(toLatLngs([drone.lngLat])[0], {
      icon: droneIcon({ color: route ? route.color : '#2f6feb', focused }),
      zIndexOffset: focused ? 1000 : 0,
      keyboard: false,
    })

    marker.bindTooltip(
      `<b>${drone.id}</b> ${drone.name}<br/>` +
        `${drone.fleetName} · ${drone.model}<br/>` +
        `电量 ${drone.battery}% · 高度 ${drone.altitude} 米<br/>` +
        `任务 ${task ? task.code : '—'}`,
      { className: 'map-tip', direction: 'top', offset: [0, -10] }
    )

    marker.on('click', () => {
      if (task) store.selectTask(task.id)
    })

    marker.addTo(group)
  })
}

/* ---------------- 事件点位 ---------------- */
function renderEvents() {
  const group = layerGroups.events
  if (!group) return
  group.clearLayers()

  const detail = store.detailEvent
  if (!detail) return

  const color = EVENT_TYPE_COLOR[detail.type]
  const hex = color && color.startsWith('#') ? color : '#cc4b4b'

  L.marker(toLatLngs([detail.lngLat])[0], {
    icon: eventIcon({ color: hex, focused: true }),
    zIndexOffset: 1200,
    interactive: true,
  })
    .bindTooltip(`<b>${detail.code}</b> ${detail.district} · ${detail.road}`, {
      className: 'map-tip',
      direction: 'top',
      offset: [0, -10],
    })
    .addTo(group)
}

watch([ready, () => store.layers.airspaces, () => store.mapAirspaces], renderAirspaces, {
  immediate: true,
})
watch([ready, () => store.layers.trafficZones, () => store.mapTrafficZones], renderTrafficZones, {
  immediate: true,
})
watch(
  [ready, () => store.layers.missionAreas, () => store.mapMissionAreas, () => store.focusedTask?.id],
  renderMissionAreas,
  { immediate: true }
)
watch(
  [ready, () => store.layers.routes, () => store.mapRoutes, () => store.focusedTask?.id],
  renderRoutes,
  { immediate: true }
)
watch([ready, () => store.layers.drones, () => store.mapDrones, () => store.focusedTask?.id], renderDrones, {
  immediate: true
})
watch([ready, () => store.detailEvent?.id], renderEvents, { immediate: true })

/** 「查看飞行航线」：把视野收到该任务的航线上 */
watch(
  () => store.focusRequest.nonce,
  () => {
    const instance = map.value
    const route = store.focusedRoute
    if (!instance || !route) return
    instance.fitBounds(toLatLngs(route.path), { padding: [56, 56], maxZoom: 14, animate: true })
  }
)

onMounted(async () => {
  await nextTick()
  invalidate()
  // 布局稳定后再校正一次，避免首屏地图渲染成灰块
  requestAnimationFrame(() => invalidate())
})

const droneCount = computed(() => store.mapDrones.length)
const routeCount = computed(() => store.mapRoutes.length)
</script>

<template>
  <div class="map-shell">
    <div ref="containerRef" class="map-canvas" />

    <MapLegend class="map-legend" :drone-count="droneCount" :route-count="routeCount" />

    <!-- 指北针 -->
    <div class="map-compass" aria-hidden="true">
      <svg width="26" height="26" viewBox="0 0 26 26">
        <circle cx="13" cy="13" r="11.5" fill="#fff" fill-opacity="0.86" stroke="#e4e7ea" />
        <path d="M13 5.2 15.4 13 13 11.6 10.6 13Z" fill="#cc4b4b" />
        <path d="M13 20.8 10.6 13 13 14.4 15.4 13Z" fill="#8d97a3" />
        <text x="13" y="3.6" text-anchor="middle" font-size="6" fill="#8d97a3">N</text>
      </svg>
    </div>

    <!-- 底图降级提示：瓦片挂了也有本地区界，不会白屏 -->
    <div v-if="tileFailed" class="map-notice">
      <span class="dot" />
      在线底图暂不可用，已切换为本地行政区边界图
    </div>
  </div>
</template>

<style scoped>
.map-shell {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #f7f8f9;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.map-canvas {
  width: 100%;
  height: 100%;
}

.map-legend {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 500;
}

.map-compass {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 500;
  line-height: 0;
}

.map-notice {
  position: absolute;
  bottom: 12px;
  left: 12px;
  z-index: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 9px;
  font-size: var(--fs-11);
  color: var(--warn);
  background: var(--warn-soft);
  border: 1px solid #efdcb6;
  border-radius: var(--radius-sm);
}
</style>

<style>
/* 行政区名称 */
.map-district-label {
  display: block;
  font-size: 11px;
  font-weight: 500;
  color: #7d8794;
  letter-spacing: 0.06em;
  white-space: nowrap;
  text-shadow: 0 1px 0 #fff, 0 -1px 0 #fff, 1px 0 0 #fff, -1px 0 0 #fff;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

/* 机场地标 */
.map-place-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 5px;
  font-size: 10px;
  color: #6b7684;
  white-space: nowrap;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid var(--border);
  border-radius: 3px;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.map-place-label::before {
  content: "";
  width: 5px;
  height: 5px;
  background: #8d97a3;
  border-radius: 1px;
}

/* 无人机 / 事件点位容器：去掉 Leaflet 默认背景与边框 */
.map-drone-wrap,
.map-event-wrap,
.map-return-wrap,
.map-district-label-wrap,
.map-place-label-wrap {
  background: transparent;
  border: none;
}

/* 返航点标记。divIcon 生成的内容在组件作用域外，必须是全局样式 */
.map-return {
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
  filter: drop-shadow(0 1px 2px rgba(28, 33, 40, 0.16));
}

.map-drone,
.map-event {
  line-height: 0;
  transition: transform 0.15s;
}

.map-drone.is-focused {
  filter: drop-shadow(0 1px 3px rgba(16, 24, 40, 0.22));
}

.map-event.is-focused {
  filter: drop-shadow(0 1px 3px rgba(16, 24, 40, 0.22));
}

/* 地图气泡提示 */
.map-tip.leaflet-tooltip {
  padding: 6px 9px;
  font-size: 11px;
  line-height: 1.6;
  color: var(--text);
  background: #fff;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-pop);
}

.map-tip.leaflet-tooltip::before {
  border-top-color: var(--border);
}

.map-tip.leaflet-tooltip b {
  font-weight: 600;
}

/* Leaflet 控件浅色化 */
.leaflet-control-zoom {
  border: 1px solid var(--border) !important;
  border-radius: var(--radius-sm) !important;
  box-shadow: var(--shadow-card) !important;
  overflow: hidden;
}

.leaflet-control-zoom a {
  width: 26px !important;
  height: 26px !important;
  font-size: 15px !important;
  line-height: 26px !important;
  color: var(--text-secondary) !important;
  background: #fff !important;
  border-bottom-color: var(--border) !important;
}

.leaflet-control-zoom a:hover {
  color: var(--text) !important;
  background: var(--surface-hover) !important;
}

.leaflet-control-scale-line {
  font-size: 10px !important;
  color: var(--text-secondary) !important;
  background: rgba(255, 255, 255, 0.82) !important;
  border-color: var(--border-strong) !important;
  border-top: none !important;
}

.leaflet-container {
  font-family: var(--font-sans);
  background: #f7f8f9;
}
</style>

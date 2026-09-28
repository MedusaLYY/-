<script setup>
/**
 * 航线轨迹预览地图。
 *
 * 与监测总览的地图相互独立：这里只画一条航线，用于航线规划页的即时预览。
 * 同样遵守 Leaflet 的三条约束：实例放 shallowRef、卸载时 remove()、
 * 容器尺寸变化后 invalidateSize()（路由来回切时容器尺寸会先变成 0）。
 */

import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { AMAP_TILE_URL, DETOUR_COLOR, SHANGHAI_VIEW } from '../../domain/constants'
import { returnPointIcon } from '../../utils/mapIcons'

const props = defineProps({
  route: { type: Object, default: null },
})

const containerRef = ref(null)
const map = shallowRef(null)
const layer = shallowRef(null)

let resizeObserver = null

function render() {
  const instance = map.value
  if (!instance) return

  if (!layer.value) layer.value = L.layerGroup().addTo(instance)
  const group = layer.value
  group.clearLayers()

  const route = props.route
  if (!route || !route.path || !route.path.length) {
    instance.setView(SHANGHAI_VIEW.center, SHANGHAI_VIEW.zoom)
    return
  }

  const latlngs = route.path.map(([lng, lat]) => [lat, lng])

  L.polyline(latlngs, {
    color: route.color,
    weight: 4,
    opacity: 0.92,
    lineJoin: 'round',
    lineCap: 'round',
  }).addTo(group)

  route.anchors.forEach(([lng, lat], index) => {
    const isEnd = index === 0 || index === route.anchors.length - 1
    L.circleMarker([lat, lng], {
      radius: isEnd ? 6 : 4,
      color: '#ffffff',
      weight: 2,
      fillColor: route.color,
      fillOpacity: 1,
    }).addTo(group)
  })

  // 避障绕行段：橙色虚线
  const detours = route.detourSegments || []
  detours.forEach((segment) => {
    L.polyline(
      segment.points.map(([lng, lat]) => [lat, lng]),
      {
        color: DETOUR_COLOR,
        weight: 3,
        opacity: 0.9,
        dashArray: '7 5',
        lineCap: 'round',
        interactive: false,
      }
    ).addTo(group)
  })

  // 返航点
  if (route.returnPoint) {
    L.marker([route.returnPoint[1], route.returnPoint[0]], {
      icon: returnPointIcon({ color: route.color, focused: true }),
      interactive: false,
    }).addTo(group)
  }

  instance.fitBounds(L.latLngBounds(latlngs), { padding: [30, 30], maxZoom: 14 })
}

onMounted(() => {
  const instance = L.map(containerRef.value, {
    center: SHANGHAI_VIEW.center,
    zoom: SHANGHAI_VIEW.zoom,
    minZoom: SHANGHAI_VIEW.minZoom,
    maxZoom: SHANGHAI_VIEW.maxZoom,
    maxBounds: SHANGHAI_VIEW.bounds,
    maxBoundsViscosity: 1,
    attributionControl: false,
    zoomSnap: 0.5,
    wheelPxPerZoomLevel: 120,
  })

  L.tileLayer(AMAP_TILE_URL, {
    subdomains: ['1', '2', '3', '4'],
    className: 'amap-tiles',
    minZoom: SHANGHAI_VIEW.minZoom,
    maxZoom: SHANGHAI_VIEW.maxZoom,
  }).addTo(instance)

  map.value = instance
  render()

  resizeObserver = new ResizeObserver(() => {
    if (map.value) map.value.invalidateSize()
  })
  resizeObserver.observe(containerRef.value)
})

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (map.value) {
    map.value.remove()
    map.value = null
  }
  layer.value = null
})

watch(() => props.route, render)
</script>

<template>
  <div class="preview">
    <div ref="containerRef" class="preview-canvas" />
    <p v-if="!route" class="preview-hint">从左侧表格选择一条航线查看轨迹</p>
  </div>
</template>

<style scoped>
.preview {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.preview-canvas {
  width: 100%;
  height: 100%;
  background: var(--surface-sunken);
}

.preview-hint {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 500;
  padding: 5px 10px;
  font-size: var(--fs-11);
  color: var(--text-secondary);
  white-space: nowrap;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  transform: translate(-50%, -50%);
}
</style>

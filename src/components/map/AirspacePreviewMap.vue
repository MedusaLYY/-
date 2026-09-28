<script setup>
/**
 * 空域多边形预览地图。
 *
 * 与监测总览的地图相互独立：这里只画一个空域，用于空域管理页的即时预览。
 * 同样遵守 Leaflet 的几条铁律：实例放 shallowRef、卸载时 remove()、
 * 容器尺寸变化后 invalidateSize()（路由来回切时容器尺寸会先变成 0）。
 */

import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { AMAP_TILE_URL, SHANGHAI_VIEW } from '../../domain/constants'

const props = defineProps({
  airspace: { type: Object, default: null },
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

  const item = props.airspace
  if (!item || !item.polygon || !item.polygon.length) {
    instance.setView(SHANGHAI_VIEW.center, SHANGHAI_VIEW.zoom)
    return
  }

  const latlngs = item.polygon.map(([lng, lat]) => [lat, lng])

  L.polygon(latlngs, {
    color: item.color,
    weight: 2,
    opacity: 0.9,
    fillColor: item.color,
    fillOpacity: 0.16,
    interactive: false,
  }).addTo(group)

  L.circleMarker([item.center[1], item.center[0]], {
    radius: 4,
    color: '#ffffff',
    weight: 2,
    fillColor: item.color,
    fillOpacity: 1,
  }).addTo(group)

  instance.fitBounds(L.latLngBounds(latlngs), { padding: [30, 30], maxZoom: 13 })
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

watch(() => props.airspace, render)
</script>

<template>
  <div class="preview">
    <div ref="containerRef" class="preview-canvas" />
    <p v-if="!airspace" class="preview-hint">从左侧表格选择一条空域查看范围</p>
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

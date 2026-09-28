<script setup>
import { computed } from 'vue'
import { useMonitorStore } from '../../stores/monitor'
import { MAP_LAYERS } from '../../domain/constants'

defineProps({
  droneCount: { type: Number, default: 0 },
  routeCount: { type: Number, default: 0 },
})

const store = useMonitorStore()

/** 各图层当前数量。新增图层时这里加一行即可，图层清单本身在 constants 的 MAP_LAYERS */
const counts = computed(() => ({
  drones: store.mapDrones.length,
  routes: store.mapRoutes.length,
  missionAreas: store.mapMissionAreas.length,
  trafficZones: store.mapTrafficZones.length,
  airspaces: store.mapAirspaces.length,
}))

const items = computed(() =>
  MAP_LAYERS.map((layer) => ({ ...layer, count: counts.value[layer.key] || 0 }))
)
</script>

<template>
  <div class="legend">
    <ul class="legend-list">
      <li v-for="item in items" :key="item.key">
        <button
          class="legend-item"
          :class="{ 'is-off': !store.layers[item.key] }"
          type="button"
          :title="store.layers[item.key] ? '点击隐藏该图层' : '点击显示该图层'"
          @click="store.toggleLayer(item.key)"
        >
          <i class="legend-mark" :class="`mark-${item.kind}`" />
          <span class="legend-label">{{ item.label }}</span>
          <span class="legend-count num">{{ item.count }}</span>
        </button>
      </li>
    </ul>

    <div class="legend-divider" />

    <button
      class="legend-switch"
      type="button"
      role="switch"
      :aria-checked="store.layers.realtime"
      @click="store.toggleLayer('realtime')"
    >
      <span class="legend-label">实时任务</span>
      <span class="switch" :aria-checked="store.layers.realtime" />
    </button>
  </div>
</template>

<style scoped>
.legend {
  width: 152px;
  padding: 6px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
  backdrop-filter: blur(4px);
}

.legend-list {
  display: flex;
  flex-direction: column;
}

.legend-item,
.legend-switch {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  height: 24px;
  padding: 0 5px;
  font-size: var(--fs-11);
  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  text-align: left;
}

.legend-item:hover,
.legend-switch:hover {
  background: var(--surface-hover);
}

.legend-item.is-off {
  color: var(--text-muted);
  opacity: 0.55;
}

.legend-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.legend-count {
  font-size: 10px;
  color: var(--text-muted);
}

.legend-mark {
  flex: none;
  width: 12px;
  height: 12px;
}

/* 图例图形与地图上实际画法保持一致 */
.mark-drone {
  background: #2f6feb;
  clip-path: polygon(50% 0, 62% 44%, 50% 36%, 38% 44%);
}

.mark-route {
  height: 2px;
  background: repeating-linear-gradient(90deg, #2f6feb 0 4px, transparent 4px 7px);
}

.mark-area {
  background: rgba(47, 111, 235, 0.14);
  border: 1.4px solid #2f6feb;
}

.mark-zone {
  background: rgba(204, 75, 75, 0.1);
  border: 1.4px dashed #cc4b4b;
}

/* 空域是实线（禁飞区为实线描边），与交通航区的虚线区分开 */
.mark-airspace {
  background: rgba(204, 75, 75, 0.06);
  border: 1.4px solid #cc4b4b;
}

.legend-divider {
  height: 1px;
  margin: 5px 4px;
  background: var(--border);
}
</style>

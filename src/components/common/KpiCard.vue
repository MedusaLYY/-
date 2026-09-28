<script setup>
import { computed } from 'vue'
import { toFixed } from '../../utils/format'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [Number, String], required: true },
  unit: { type: String, default: '' },
  delta: { type: String, default: '' },
  deltaTone: { type: String, default: 'flat' },
  trend: { type: Array, default: null },
  compact: { type: Boolean, default: false },
})

/** 迷你走势：直接用内联 SVG 画，不为一个 sparkline 引入图表实例 */
const sparkline = computed(() => {
  const points = props.trend
  if (!points || points.length < 2) return null
  const width = 72
  const height = 22
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const step = width / (points.length - 1)
  const coords = points.map((value, index) => {
    const x = index * step
    const y = height - ((value - min) / span) * (height - 4) - 2
    return [x, y]
  })
  const line = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `0,${height} ${line} ${width},${height}`
  return { width, height, line, area }
})

const toneClass = computed(() => `delta-${props.deltaTone}`)
const displayValue = computed(() =>
  typeof props.value === 'number' ? toFixed(props.value, Number.isInteger(props.value) ? 0 : 1) : props.value
)
</script>

<template>
  <div class="kpi" :class="{ 'is-compact': compact }">
    <div class="kpi-label">{{ label }}</div>
    <div class="kpi-value-row">
      <span class="kpi-value num">{{ displayValue }}</span>
      <span v-if="unit" class="kpi-unit">{{ unit }}</span>
      <svg
        v-if="sparkline"
        class="kpi-spark"
        :viewBox="`0 0 ${sparkline.width} ${sparkline.height}`"
        :width="sparkline.width"
        :height="sparkline.height"
        aria-hidden="true"
      >
        <polygon :points="sparkline.area" fill="var(--accent)" fill-opacity="0.1" />
        <polyline
          :points="sparkline.line"
          fill="none"
          stroke="var(--accent)"
          stroke-width="1.4"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
      </svg>
    </div>
    <div v-if="delta" class="kpi-delta" :class="toneClass">{{ delta }}</div>
  </div>
</template>

<style scoped>
.kpi {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  /* 尺寸通过 CSS 变量暴露，父级可以在矮屏媒体查询里整体压紧 */
  padding: var(--kpi-pad, 7px 9px);
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.kpi-label {
  font-size: var(--kpi-label-size, 11px);
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kpi-value-row {
  display: flex;
  align-items: baseline;
  gap: 3px;
}

.kpi-value {
  font-size: var(--kpi-value-size, 18px);
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.01em;
}

.kpi-unit {
  font-size: var(--fs-11);
  color: var(--text-secondary);
}

.kpi-spark {
  display: var(--kpi-spark-display, block);
  margin-left: auto;
  overflow: visible;
}

.kpi-delta {
  font-size: 11px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delta-up {
  color: var(--success);
}

.delta-down {
  color: var(--danger);
}

.delta-flat {
  color: var(--text-muted);
}

.is-compact .kpi-value {
  font-size: var(--fs-16);
}
</style>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },
  size: { type: Number, default: 76 },
  stroke: { type: Number, default: 6 },
  caption: { type: String, default: '' },
})

const radius = computed(() => (props.size - props.stroke) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const dash = computed(() => `${(props.value * circumference.value).toFixed(2)} ${circumference.value}`)
const center = computed(() => props.size / 2)
const percentText = computed(() => `${Math.round(props.value * 100)}%`)
</script>

<template>
  <div class="donut" :style="{ width: `${size}px`, height: `${size}px` }">
    <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" aria-hidden="true">
      <circle
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        stroke="var(--border)"
        :stroke-width="stroke"
      />
      <circle
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        stroke="var(--accent)"
        :stroke-width="stroke"
        stroke-linecap="round"
        :stroke-dasharray="dash"
        :transform="`rotate(-90 ${center} ${center})`"
      />
    </svg>
    <div class="donut-center">
      <span class="donut-value num">{{ percentText }}</span>
      <span v-if="caption" class="donut-caption">{{ caption }}</span>
    </div>
  </div>
</template>

<style scoped>
.donut {
  position: relative;
  flex: none;
}

.donut-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
}

.donut-value {
  font-size: var(--fs-16);
  font-weight: 600;
  line-height: 1;
}

.donut-caption {
  font-size: 10px;
  color: var(--text-muted);
}
</style>

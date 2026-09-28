<script setup>
import { computed, ref } from 'vue'
import { useChart } from '../../composables/useChart'

const props = defineProps({
  option: { type: Object, required: true },
  height: { type: Number, default: 200 },
})

const el = ref(null)
useChart(el, computed(() => props.option))
</script>

<template>
  <div ref="el" class="chart" :style="{ height: `${height}px` }" />
</template>

<style scoped>
.chart {
  width: 100%;
}
</style>

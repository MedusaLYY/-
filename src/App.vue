<script setup>
import { onMounted } from 'vue'
import { useMonitorStore } from './stores/monitor'

const monitor = useMonitorStore()

onMounted(() => {
  // 开发期跑一次 mock 外键自检，数据断裂会直接打印到控制台
  monitor.bootstrap()
})
</script>

<template>
  <router-view />
</template>

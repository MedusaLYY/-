<script setup>
import { computed } from 'vue'
import { useMonitorStore } from '../../stores/monitor'
import { FLEET_OPTIONS } from '../../mock'
import { TIME_RANGE_OPTIONS, TASK_TYPE_LABEL } from '../../domain/constants'
import FilterSelect from '../common/FilterSelect.vue'
import KpiCard from '../common/KpiCard.vue'

const store = useMonitorStore()

const scopeHint = computed(() => {
  const view = store.kpiView
  if (view.scope === 'global') return null
  if (view.scope === 'empty') return { text: '当前筛选条件下无匹配任务', tone: 'warn' }
  const task = store.focusedTask
  return {
    text: `已收窄至 ${view.scopeLabel}`,
    tone: 'accent',
    detail: task ? `${TASK_TYPE_LABEL[task.type]} · 进度 ${task.progress}%` : '',
  }
})
</script>

<template>
  <section class="card">
    <div class="card-head">
      <h2 class="card-title">低空运行概览</h2>
      <div class="card-head-spacer" />
      <span class="scope-badge">{{ store.kpiView.scopeLabel }}</span>
    </div>

    <div class="card-body overview-body">
      <div class="overview-filters">
        <FilterSelect
          label="无人机集群"
          :model-value="store.filters.fleetId"
          :options="FLEET_OPTIONS"
          @update:model-value="store.setFilter('fleetId', $event)"
        />
        <FilterSelect
          label="空域范围"
          :model-value="store.filters.district"
          :options="store.districtOptions"
          @update:model-value="store.setFilter('district', $event)"
        />
        <FilterSelect
          label="时间范围"
          :model-value="store.scope.timeRange"
          :options="TIME_RANGE_OPTIONS"
          @update:model-value="store.setScope('timeRange', $event)"
        />
      </div>

      <p v-if="scopeHint" class="scope-hint" :class="`hint-${scopeHint.tone}`">
        <span class="hint-text">{{ scopeHint.text }}</span>
        <span v-if="scopeHint.detail" class="hint-detail">{{ scopeHint.detail }}</span>
      </p>

      <div v-if="store.kpiView.items.length" class="overview-kpis">
        <KpiCard
          v-for="item in store.kpiView.items"
          :key="item.key"
          :label="item.label"
          :value="item.value"
          :unit="item.unit"
          :delta="item.delta"
          :delta-tone="item.deltaTone"
          :trend="item.trend"
        />
      </div>
      <p v-else class="empty">调整筛选条件后可查看运行概览</p>
    </div>
  </section>
</template>

<style scoped>
.overview-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px var(--pad-card);
}

.scope-badge {
  font-size: 10px;
  color: var(--text-muted);
  max-width: 170px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 三个筛选并排放一行，避免占掉两行高度 */
.overview-filters {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.overview-filters :deep(.field) {
  min-width: 0;
}

.overview-filters :deep(.select) {
  padding-right: 18px;
  padding-left: 6px;
  background-position: right 5px center;
}

.scope-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  font-size: var(--fs-11);
  border-radius: var(--radius-sm);
}

.hint-accent {
  color: var(--accent);
  background: var(--accent-soft);
}

.hint-warn {
  color: var(--warn);
  background: var(--warn-soft);
}

.hint-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hint-detail {
  flex: none;
  opacity: 0.75;
}

.overview-kpis {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

/* 矮屏（768p~900p）：4 个 KPI 压成一行并去掉迷你走势，把高度让给下方可滚动列表 */
@media (max-height: 900px) {
  .overview-kpis {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    --kpi-pad: 6px 7px;
    --kpi-value-size: 15px;
    --kpi-label-size: 10px;
    --kpi-spark-display: none;
  }
}

@media (max-height: 800px) {
  .overview-body {
    padding: 8px var(--pad-card);
  }

  .overview-kpis {
    --kpi-value-size: 14px;
  }
}
</style>

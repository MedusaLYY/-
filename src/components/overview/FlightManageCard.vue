<script setup>
import { computed } from 'vue'
import { useMonitorStore } from '../../stores/monitor'
import {
  MANAGE_TABS,
  MANAGE_TAB,
  TASK_TYPE_LABEL,
  TASK_STATUS_LABEL,
  TASK_STATUS_TAG,
  EVENT_TYPE_LABEL,
  EVENT_TYPE_COLOR,
} from '../../domain/constants'
import { toFixed, fileSize } from '../../utils/format'
import SegmentedTabs from '../common/SegmentedTabs.vue'
import FilterSelect from '../common/FilterSelect.vue'
import SearchInput from '../common/SearchInput.vue'
import StatusTag from '../common/StatusTag.vue'

const store = useMonitorStore()

const taskTypeOptions = [
  { value: '', label: '全部任务' },
  ...Object.entries(TASK_TYPE_LABEL).map(([value, label]) => ({ value, label })),
]

const taskStatusOptions = [
  { value: '', label: '全部状态' },
  ...Object.entries(TASK_STATUS_LABEL).map(([value, label]) => ({ value, label })),
]

/**
 * 三个 Tab 的数字统一表示「当前筛选条件下的记录数」，
 * 与独立页面（#/routes、#/tasks、#/data）的表格行数一致。
 *
 * 注意不要再用 mapTasks —— 那是地图的在途过滤口径（只含执行中的任务），
 * 用它会让航线 Tab 显示 10 而任务 Tab 显示 20，看起来像数据错了。
 */
const tabs = computed(() =>
  MANAGE_TABS.map((tab) => ({
    ...tab,
    count: tab.key === MANAGE_TAB.DATA ? store.scopedAssets.length : store.filteredTasks.length,
  }))
)

const activeEvent = computed(() => store.activeEvent)

const emptyText = computed(() => {
  if (activeEvent.value) return '该事件关联的无人机暂无对应记录'
  if (store.activeFilterCount) return '当前筛选条件下没有匹配记录，试试重置筛选'
  return '暂无记录'
})

const activeTaskId = computed(() => store.focusedTask?.id || null)

function progressTone(progress) {
  if (progress >= 100) return 'tone-done'
  if (progress >= 60) return 'tone-high'
  if (progress >= 30) return 'tone-mid'
  return 'tone-low'
}
</script>

<template>
  <section class="card manage-card">
    <div class="card-head">
      <h2 class="card-title">无人机低空飞行管理</h2>
      <div class="card-head-spacer" />
      <span
        class="manage-count num"
        title="列表显示当前筛选条件下的全部记录；地图只画执行中任务的航线，两者口径不同"
      >
        地图在途 {{ store.mapTasks.length }} 条 · 列表 {{ store.filteredTasks.length }} 条
      </span>
    </div>

    <!-- Tab 单独占一行：三个中文 Tab 挤在标题右侧会换行成竖排 -->
    <div class="manage-tabs">
      <SegmentedTabs
        :tabs="tabs"
        :model-value="store.manageTab"
        variant="segment"
        @update:model-value="store.setManageTab"
      />
    </div>

    <div class="manage-filters">
      <p v-if="activeEvent" class="event-chip">
        <i class="dot" :style="{ color: EVENT_TYPE_COLOR[activeEvent.type] }" />
        <span class="chip-text">
          事件筛选：{{ EVENT_TYPE_LABEL[activeEvent.type] }} · {{ activeEvent.district }}
          {{ activeEvent.road }}
        </span>
        <button class="chip-close" type="button" aria-label="清除事件筛选" @click="store.clearEvent()">
          ×
        </button>
      </p>

      <div class="filter-grid">
        <FilterSelect
          label="任务类型"
          :model-value="store.filters.taskType"
          :options="taskTypeOptions"
          @update:model-value="store.setFilter('taskType', $event)"
        />
        <FilterSelect
          label="执行状态"
          :model-value="store.filters.taskStatus"
          :options="taskStatusOptions"
          @update:model-value="store.setFilter('taskStatus', $event)"
        />
        <FilterSelect
          label="所属机队"
          :model-value="store.filters.fleetId"
          :options="[{ value: '', label: '全部机队' }, ...store.fleets.map((f) => ({ value: f.id, label: f.name }))]"
          @update:model-value="store.setFilter('fleetId', $event)"
        />
      </div>

      <div class="filter-row">
        <SearchInput
          :model-value="store.filters.keyword"
          placeholder="请输入任务名称或任务编号"
          @update:model-value="store.setFilter('keyword', $event)"
        />
        <button
          class="btn btn-xs reset-btn"
          type="button"
          :disabled="!store.activeFilterCount"
          @click="store.resetFilters()"
        >
          重置{{ store.activeFilterCount ? ` (${store.activeFilterCount})` : '' }}
        </button>
      </div>
    </div>

    <div class="manage-list scroll-y">
      <template v-if="store.manageRows.length">
        <!-- 航线规划 -->
        <button
          v-for="row in store.manageTab === MANAGE_TAB.ROUTE ? store.manageRows : []"
          :key="row.id"
          class="row"
          :class="{ 'is-active': row.taskId === activeTaskId }"
          type="button"
          @click="store.selectTask(row.taskId)"
        >
          <div class="row-main">
            <span class="row-title">{{ row.name }}</span>
            <span class="row-sub">
              {{ row.code }} · {{ row.district }} {{ row.road }}
            </span>
          </div>
          <div class="row-meta">
            <span class="num">{{ toFixed(row.distanceKm, 1) }} km</span>
            <span class="num">{{ row.durationMin }} min</span>
          </div>
        </button>

        <!-- 任务执行 -->
        <button
          v-for="row in store.manageTab === MANAGE_TAB.TASK ? store.manageRows : []"
          :key="row.id"
          class="row row-task"
          :class="{ 'is-active': row.id === activeTaskId }"
          type="button"
          @click="store.selectTask(row.id)"
        >
          <div class="row-main">
            <span class="row-title">
              {{ row.name }}
              <StatusTag :text="TASK_STATUS_LABEL[row.status]" :tone="TASK_STATUS_TAG[row.status].replace('tag-', '')" />
            </span>
            <span class="row-sub">
              {{ row.code }} · {{ TASK_TYPE_LABEL[row.type] }} · {{ row.droneId }}
            </span>
            <span class="row-progress">
              <span class="bar">
                <i :class="progressTone(row.progress)" :style="{ width: `${row.progress}%` }" />
              </span>
              <span class="bar-text num">{{ row.progress }}%</span>
            </span>
          </div>
          <div class="row-meta">
            <span class="num">{{ toFixed(row.distanceKm, 1) }} km</span>
            <span class="num">{{ row.durationMin }} min</span>
          </div>
        </button>

        <!-- 数据管理 -->
        <div
          v-for="row in store.manageTab === MANAGE_TAB.DATA ? store.manageRows : []"
          :key="row.id"
          class="row row-data"
        >
          <div class="row-main">
            <span class="row-title">{{ row.categoryLabel }}</span>
            <span class="row-sub">{{ row.taskCode }} · {{ row.storage }} · {{ row.status }}</span>
          </div>
          <div class="row-meta">
            <span class="num">{{ toFixed(row.amount, 1) }} {{ row.unit }}</span>
            <span class="num muted">{{ fileSize(row.sizeMb) }}</span>
          </div>
        </div>
      </template>

      <p v-else class="empty">{{ emptyText }}</p>
    </div>
  </section>
</template>

<style scoped>
.manage-card {
  min-height: 0;
}

.manage-head {
  gap: 8px;
  padding-right: 8px;
}

.manage-count {
  flex: none;
  font-size: 10px;
  color: var(--text-muted);
}

.manage-tabs {
  flex: none;
  padding: 9px var(--pad-card) 0;
}

.manage-tabs :deep(.tabs) {
  width: 100%;
}

.manage-tabs :deep(.tab) {
  flex: 1;
  justify-content: center;
  padding: 0 6px;
  font-size: var(--fs-11);
}

.manage-filters {
  display: flex;
  flex: none;
  flex-direction: column;
  gap: 7px;
  padding: 9px var(--pad-card);
  border-bottom: 1px solid var(--border);
}

.event-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  font-size: var(--fs-11);
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-sm);
}

.chip-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip-close {
  flex: none;
  width: 15px;
  height: 15px;
  font-size: 13px;
  line-height: 1;
  color: var(--accent);
  background: transparent;
  border: none;
  border-radius: 50%;
}

.chip-close:hover {
  background: rgba(47, 111, 235, 0.14);
}

/* 三个下拉并排一行 + 搜索/重置一行，比两行下拉省约 60px 高度 */
.filter-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.filter-grid :deep(.field) {
  min-width: 0;
}

.filter-grid :deep(.select) {
  padding-right: 18px;
  padding-left: 6px;
  background-position: right 5px center;
}

.filter-row {
  display: flex;
  gap: 6px;
}

.filter-row :deep(.input) {
  flex: 1;
  min-width: 0;
}

.reset-btn {
  flex: none;
  height: 28px;
}

/* ---- 列表 ---- */
.manage-list {
  flex: 1;
  min-height: 0;
  padding: 4px;
}

.row {
  display: flex;
  gap: 8px;
  width: 100%;
  padding: 7px 8px;
  text-align: left;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  transition: background 0.12s, border-color 0.12s;
}

button.row {
  cursor: pointer;
}

.row:hover {
  background: var(--surface-hover);
}

.row.is-active {
  background: var(--accent-soft);
  border-color: var(--accent-border);
}

.row + .row {
  margin-top: 2px;
}

.row-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.row-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-12);
  font-weight: 500;
  color: var(--text);
}

.row-sub {
  font-size: 10px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-meta {
  display: flex;
  flex: none;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  font-size: 10px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.row-progress {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}

.bar {
  flex: 1;
  height: 3px;
  overflow: hidden;
  background: var(--border);
  border-radius: var(--radius-pill);
}

.bar i {
  display: block;
  height: 100%;
  border-radius: var(--radius-pill);
}

.tone-low {
  background: var(--text-muted);
}

.tone-mid {
  background: var(--warn);
}

.tone-high {
  background: var(--accent);
}

.tone-done {
  background: var(--success);
}

.bar-text {
  flex: none;
  font-size: 10px;
  color: var(--text-muted);
}
</style>

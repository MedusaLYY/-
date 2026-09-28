<script setup>
import { computed, ref } from 'vue'
import { useMonitorStore } from '../../stores/monitor'
import { AI_CATEGORY, AI_CATEGORY_LABEL } from '../../domain/constants'
import { clockTime, percent } from '../../utils/format'
import SegmentedTabs from '../common/SegmentedTabs.vue'
import DonutRing from '../common/DonutRing.vue'

const store = useMonitorStore()

const activeCategory = ref(AI_CATEGORY.TRAFFIC_STATE)

const tabs = [
  { key: AI_CATEGORY.TRAFFIC_STATE, label: AI_CATEGORY_LABEL.traffic_state },
  { key: AI_CATEGORY.ABNORMAL_EVENT, label: AI_CATEGORY_LABEL.abnormal_event },
  { key: AI_CATEGORY.VIOLATION, label: AI_CATEGORY_LABEL.violation },
]

const summary = computed(() => store.aiSummary)

/** 当前分类下的识别流水 */
const rows = computed(() =>
  store.focusedAiResults.filter((row) => row.category === activeCategory.value)
)

const scopeLabel = computed(() =>
  store.detailEvent ? `${store.detailEvent.district} ${store.detailEvent.road}` : '全域巡检'
)

const metrics = computed(() => [
  {
    key: 'congestion',
    label: '拥堵等级',
    value: summary.value.congestionLevel,
    tone: 'warn',
  },
  { key: 'abnormal', label: '异常事件', value: `${summary.value.abnormalCount} 起`, tone: 'danger' },
  { key: 'violation', label: '违法取证', value: `${summary.value.violationCount} 起`, tone: 'danger' },
])

function levelTone(level) {
  if (level === 'danger') return 'danger'
  if (level === 'warn') return 'warn'
  if (level === 'ok') return 'success'
  return 'neutral'
}
</script>

<template>
  <section class="card ai-card">
    <div class="card-head">
      <h2 class="card-title">AI 识别分析</h2>
      <div class="card-head-spacer" />
      <span class="live">
        <i class="live-dot" />
        实时分析中
      </span>
    </div>

    <div class="ai-tabs">
      <SegmentedTabs :tabs="tabs" v-model="activeCategory" variant="segment" />
    </div>

    <div class="card-body ai-body">
      <p class="ai-scope">识别范围：{{ scopeLabel }}</p>

      <div class="metric-grid">
        <div v-for="item in metrics" :key="item.key" class="metric">
          <span class="metric-key">{{ item.label }}</span>
          <span class="metric-val" :class="`tone-${item.tone}`">{{ item.value }}</span>
        </div>
      </div>

      <div class="confidence">
        <div class="confidence-text">
          <span class="metric-key">事件置信度</span>
          <span class="confidence-note">{{ summary.confidenceText }}</span>
          <span class="confidence-sample muted">
            基于当前范围 {{ store.focusedAiResults.length }} 条识别记录
          </span>
        </div>
        <DonutRing :value="summary.confidence" :size="68" :stroke="6" />
      </div>

      <div class="ai-run">
        <span class="metric-key">运行识别</span>
        <span class="metric-val" :class="summary.runtimeCount ? 'tone-danger' : 'tone-neutral'">
          {{ summary.runtimeCount }} 起
        </span>
        <span class="muted">无人机自身运行异常（载荷 / 姿态 / 链路）</span>
      </div>

      <div class="result-block">
        <div class="result-head">
          <span class="result-title">最新识别结果</span>
          <span class="muted num">{{ rows.length }} 条</span>
        </div>

        <ul class="result-list scroll-y">
          <li v-for="row in rows" :key="row.id" class="result-row">
            <span class="result-time num">{{ clockTime(row.detectedAt) }}</span>
            <i class="dot" :class="`tone-${levelTone(row.level)}`" />
            <span class="result-main">
              <span class="result-label">{{ row.summary }}</span>
              <span class="result-place">{{ row.district }} {{ row.road }}</span>
            </span>
            <span class="result-conf num">
              {{ row.confidence === null ? '—' : percent(row.confidence) }}
            </span>
          </li>
          <li v-if="!rows.length" class="empty">该分类下暂无识别记录</li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ai-card {
  flex: 1;
  min-height: 0;
}

.ai-tabs {
  flex: none;
  padding: 9px var(--pad-card);
  border-bottom: 1px solid var(--border);
}

.ai-tabs :deep(.tabs) {
  width: 100%;
}

.ai-tabs :deep(.tab) {
  flex: 1;
  justify-content: center;
  padding: 0 4px;
  font-size: var(--fs-11);
}

.live {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: var(--fs-11);
  color: var(--success);
}

.live-dot {
  width: 6px;
  height: 6px;
  background: var(--success);
  border-radius: 50%;
  animation: pulse 1.8s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.35;
    transform: scale(0.8);
  }
}

.ai-body {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.ai-scope {
  font-size: 10px;
  color: var(--text-muted);
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 7px 9px;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.metric-key {
  font-size: var(--fs-11);
  color: var(--text-muted);
}

.metric-val {
  font-size: var(--fs-13);
  font-weight: 600;
}

.tone-danger {
  color: var(--danger);
}

.tone-warn {
  color: var(--warn);
}

.tone-success {
  color: var(--success);
}

.tone-neutral {
  color: var(--text-secondary);
}

.confidence {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.confidence-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.confidence-note {
  font-size: var(--fs-12);
  font-weight: 500;
}

.confidence-sample {
  font-size: 10px;
}

.ai-run {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 9px;
  font-size: var(--fs-11);
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.ai-run .metric-val {
  font-size: var(--fs-12);
}

.ai-run .muted {
  font-size: 10px;
}

/* ---- 识别结果 ---- */
.result-block {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.result-head {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 5px;
  font-size: var(--fs-11);
}

.result-title {
  font-weight: 500;
}

.result-head .muted {
  font-size: 10px;
}

.result-list {
  flex: 1;
  min-height: 92px;
  border-top: 1px solid var(--border);
}

.result-row {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 6px 2px;
  font-size: var(--fs-11);
  border-bottom: 1px solid var(--border);
}

.result-row:last-child {
  border-bottom: none;
}

.result-time {
  flex: none;
  padding-top: 1px;
  color: var(--text-muted);
}

.result-row .dot {
  margin-top: 5px;
}

.result-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.result-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-place {
  font-size: 10px;
  color: var(--text-muted);
}

.result-conf {
  flex: none;
  padding-top: 1px;
  color: var(--text-secondary);
}
</style>

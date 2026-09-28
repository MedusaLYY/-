<script setup>
import { computed } from 'vue'
import { useMonitorStore } from '../../stores/monitor'
import {
  EVENT_TYPE_LABEL,
  EVENT_TYPE_COLOR,
  EVIDENCE_STATUS_LABEL,
  TASK_TYPE_LABEL,
} from '../../domain/constants'
import { dateTime, percent } from '../../utils/format'
import StatusTag from '../common/StatusTag.vue'

const store = useMonitorStore()

const event = computed(() => store.detailEvent)
const evidence = computed(() => store.focusedEvidence)

const primaryEvidence = computed(() => evidence.value[0] || null)

const isCaptured = computed(
  () => primaryEvidence.value && primaryEvidence.value.status === 'captured'
)
</script>

<template>
  <section class="card detail-card">
    <div class="card-head">
      <h2 class="card-title">事件详情</h2>
      <div class="card-head-spacer" />
      <button
        class="btn btn-primary btn-xs"
        type="button"
        :disabled="!store.focusedRoute"
        @click="store.requestFocusRoute()"
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M1 4.6 11 1.4 7.8 11.4 5.6 7 1 4.6Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" />
        </svg>
        查看飞行航线
      </button>
    </div>

    <div v-if="event" class="card-body detail-body">
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-key">事件类型</span>
          <span class="detail-val">
            <i class="dot" :style="{ color: EVENT_TYPE_COLOR[event.type] }" />
            {{ EVENT_TYPE_LABEL[event.type] }}
          </span>
        </div>
        <div class="detail-item">
          <span class="detail-key">事件位置</span>
          <span class="detail-val" :title="`${event.district} ${event.road}`">
            {{ event.district }} {{ event.road }}
          </span>
        </div>
        <div class="detail-item">
          <span class="detail-key">关联无人机</span>
          <span class="detail-val num">{{ event.droneId }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-key">事件时间</span>
          <span class="detail-val num">{{ dateTime(event.time) }}</span>
        </div>
      </div>

      <!-- 事件航拍快照：用内联 SVG 表示，不依赖任何图片资源 -->
      <figure class="snapshot">
        <svg viewBox="0 0 320 132" preserveAspectRatio="xMidYMid slice" role="img" :aria-label="`${event.district}${event.road}${event.imageLabel}航拍快照`">
          <rect width="320" height="132" fill="#eef1f4" />
          <!-- 街区 -->
          <g fill="#e4e8ec">
            <rect x="8" y="8" width="70" height="34" rx="2" />
            <rect x="86" y="6" width="58" height="40" rx="2" />
            <rect x="152" y="10" width="76" height="30" rx="2" />
            <rect x="236" y="6" width="70" height="38" rx="2" />
            <rect x="10" y="92" width="64" height="32" rx="2" />
            <rect x="84" y="88" width="60" height="38" rx="2" />
            <rect x="154" y="94" width="72" height="30" rx="2" />
            <rect x="236" y="90" width="72" height="34" rx="2" />
          </g>
          <!-- 主干道 -->
          <path d="M0 62 H320" stroke="#d2d7dd" stroke-width="20" />
          <path d="M0 62 H320" stroke="#f6f7f8" stroke-width="2" stroke-dasharray="8 10" />
          <path d="M142 0 V132" stroke="#d2d7dd" stroke-width="16" />
          <path d="M142 0 V132" stroke="#f6f7f8" stroke-width="2" stroke-dasharray="8 10" />
          <!-- 车辆 -->
          <g fill="#aab3bd">
            <rect x="34" y="56" width="13" height="7" rx="1.5" />
            <rect x="60" y="64" width="13" height="7" rx="1.5" />
            <rect x="196" y="56" width="13" height="7" rx="1.5" />
            <rect x="226" y="64" width="13" height="7" rx="1.5" />
            <rect x="266" y="56" width="13" height="7" rx="1.5" />
            <rect x="136" y="22" width="7" height="13" rx="1.5" />
            <rect x="136" y="100" width="7" height="13" rx="1.5" />
          </g>
          <!-- 违停目标车 -->
          <rect x="92" y="56" width="15" height="8" rx="1.5" fill="#cc4b4b" />
          <rect x="86" y="49" width="27" height="22" rx="3" fill="none" stroke="#cc4b4b" stroke-width="1.6" stroke-dasharray="5 3" />
          <text x="99" y="44" text-anchor="middle" font-size="8" fill="#cc4b4b">违停目标</text>
        </svg>

        <span class="snapshot-tag">{{ event.imageLabel }}</span>
        <StatusTag
          v-if="isCaptured"
          class="snapshot-status"
          text="已取证"
          tone="success"
          dot
        />
        <figcaption class="snapshot-caption">
          {{ event.code }} · 由 {{ event.droneId }} 于 {{ dateTime(event.time) }} 采集
        </figcaption>
      </figure>

      <p class="detail-desc">{{ event.description }}</p>

      <div class="detail-meta">
        <div class="meta-row">
          <span class="meta-key">关联任务</span>
          <span class="meta-val">{{ event.taskCode }} · {{ event.taskName }}</span>
        </div>
        <div class="meta-row">
          <span class="meta-key">任务类型</span>
          <span class="meta-val">
            {{ TASK_TYPE_LABEL[store.focusedTask ? store.focusedTask.type : ''] || '—' }}
          </span>
        </div>
        <div v-if="primaryEvidence" class="meta-row">
          <span class="meta-key">取证状态</span>
          <span class="meta-val">
            <StatusTag
              :text="EVIDENCE_STATUS_LABEL[primaryEvidence.status]"
              :tone="primaryEvidence.status === 'captured' ? 'success' : 'warn'"
            />
            <span class="muted num">
              {{ primaryEvidence.code }} · 置信度 {{ percent(primaryEvidence.confidence) }} ·
              {{ primaryEvidence.chainStatus }}
            </span>
          </span>
        </div>
      </div>
    </div>

    <p v-else class="empty">暂无可展示的事件</p>
  </section>
</template>

<style scoped>
.detail-card {
  flex: none;
}

.detail-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 10px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.detail-key {
  font-size: var(--fs-11);
  color: var(--text-muted);
}

.detail-val {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: var(--fs-12);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---- 快照 ---- */
.snapshot {
  position: relative;
  margin: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.snapshot svg {
  display: block;
  width: 100%;
  height: 132px;
}

.snapshot-tag {
  position: absolute;
  top: 7px;
  left: 7px;
  padding: 1px 6px;
  font-size: var(--fs-11);
  color: var(--text);
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.snapshot-status {
  position: absolute;
  top: 7px;
  right: 7px;
}

.snapshot-caption {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 12px 8px 5px;
  font-size: 10px;
  color: var(--text-secondary);
  background: linear-gradient(to top, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0));
}

.detail-desc {
  font-size: var(--fs-12);
  line-height: 1.65;
  color: var(--text-secondary);
}

.detail-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 9px;
  border-top: 1px solid var(--border);
}

.meta-row {
  display: flex;
  gap: 8px;
  font-size: var(--fs-12);
}

.meta-key {
  flex: none;
  width: 52px;
  color: var(--text-muted);
}

.meta-val {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
  color: var(--text);
}

.meta-val .muted {
  font-size: 10px;
}
</style>

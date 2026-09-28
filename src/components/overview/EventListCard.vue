<script setup>
import { useMonitorStore } from '../../stores/monitor'
import { EVENT_TYPE_LABEL, EVENT_TYPE_COLOR, EVENT_LEVEL_LABEL, EVENT_LEVEL_TAG } from '../../domain/constants'
import { shortDateTime } from '../../utils/format'
import StatusTag from '../common/StatusTag.vue'

const store = useMonitorStore()
</script>

<template>
  <section class="card event-card">
    <div class="card-head">
      <h2 class="card-title">告警事件 / 任务记录</h2>
      <div class="card-head-spacer" />
      <button
        v-if="store.activeEventId"
        class="link-more"
        type="button"
        @click="store.clearEvent()"
      >
        清除筛选
      </button>
      <span class="event-total num">{{ store.filteredEvents.length }} 条</span>
    </div>

    <div class="event-list scroll-y">
      <button
        v-for="event in store.filteredEvents"
        :key="event.id"
        class="event-row"
        :class="{ 'is-active': event.id === store.activeEventId }"
        type="button"
        :title="`点击筛选正在执行该事件的无人机（${event.droneId}）`"
        @click="store.selectEvent(event.id)"
      >
        <i class="dot" :style="{ color: EVENT_TYPE_COLOR[event.type] }" />
        <span class="event-main">
          <span class="event-line">
            <span class="event-type">{{ EVENT_TYPE_LABEL[event.type] }}</span>
            <StatusTag
              :text="EVENT_LEVEL_LABEL[event.level]"
              :tone="EVENT_LEVEL_TAG[event.level].replace('tag-', '')"
            />
          </span>
          <span class="event-place">{{ event.district }} {{ event.road }}</span>
        </span>
        <span class="event-time num">{{ shortDateTime(event.time) }}</span>
      </button>

      <p v-if="!store.filteredEvents.length" class="empty">
        当前筛选条件下没有事件记录
      </p>
    </div>

    <div class="event-foot">
      <span class="foot-hint">
        {{ store.activeEventId ? `已锁定 ${store.activeEvent.droneId}，点击同一条可取消` : '点击任一条，筛选执行该事件的无人机' }}
      </span>
    </div>
  </section>
</template>

<style scoped>
.event-card {
  flex: none;
}

.event-total {
  font-size: var(--fs-11);
  color: var(--text-muted);
}

.event-list {
  flex: 1;
  min-height: 0;
  max-height: 168px;
  padding: 4px;
}

.event-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  text-align: left;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  transition: background 0.12s, border-color 0.12s;
}

.event-row:hover {
  background: var(--surface-hover);
}

.event-row.is-active {
  background: var(--accent-soft);
  border-color: var(--accent-border);
}

.event-row + .event-row {
  margin-top: 1px;
}

.event-row .dot {
  flex: none;
  width: 7px;
  height: 7px;
}

.event-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.event-line {
  display: flex;
  align-items: center;
  gap: 6px;
}

.event-type {
  font-size: var(--fs-12);
  font-weight: 500;
  color: var(--text);
}

.event-place {
  font-size: 10px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-time {
  flex: none;
  font-size: 10px;
  color: var(--text-muted);
}

.event-foot {
  flex: none;
  padding: 6px var(--pad-card);
  border-top: 1px solid var(--border);
}

.foot-hint {
  font-size: 10px;
  color: var(--text-muted);
}

/* 矮屏：事件列表让出高度给上方的飞行管理列表 */
@media (max-height: 800px) {
  .event-list {
    max-height: 128px;
  }

  .event-foot {
    padding: 4px var(--pad-card);
  }
}
</style>

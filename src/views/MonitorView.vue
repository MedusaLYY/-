<script setup>
import TopBar from '../components/layout/TopBar.vue'
import OverviewCard from '../components/overview/OverviewCard.vue'
import FlightManageCard from '../components/overview/FlightManageCard.vue'
import EventListCard from '../components/overview/EventListCard.vue'
import EventDetailCard from '../components/overview/EventDetailCard.vue'
import AiAnalysisCard from '../components/overview/AiAnalysisCard.vue'
import MonitorMap from '../components/map/MonitorMap.vue'
</script>

<template>
  <div class="monitor-page">
    <TopBar />

    <div class="monitor-body">
      <aside class="col col-left">
        <OverviewCard />
        <FlightManageCard />
        <EventListCard />
      </aside>

      <main class="col col-map">
        <MonitorMap />
      </main>

      <aside class="col col-right">
        <EventDetailCard />
        <AiAnalysisCard />
      </aside>
    </div>
  </div>
</template>

<style scoped>
.monitor-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.monitor-body {
  display: grid;
  flex: 1;
  grid-template-columns: var(--col-left) minmax(0, 1fr) var(--col-right);
  gap: var(--gap);
  min-height: 0;
  padding: var(--gap);
}

.col {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  min-width: 0;
  min-height: 0;
}

.col-left {
  /* 兜底：极矮视口下宁可滚动，也不要把事件列表裁掉 */
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
}

/* 左栏中间那张卡吃掉剩余高度，上下两张按内容高度固定 */
.col-left > :nth-child(1) {
  flex: none;
}

.col-left > :nth-child(2) {
  flex: 1;
  min-height: 196px;
}

.col-left > :nth-child(3) {
  flex: none;
}

.col-map {
  overflow: hidden;
}

.col-right {
  overflow: hidden;
}

.col-right > :nth-child(1) {
  flex: none;
}

.col-right > :nth-child(2) {
  flex: 1;
  min-height: 240px;
}

/* 窄屏时收缩左右栏，优先保证地图宽度 */
@media (max-width: 1560px) {
  .monitor-body {
    grid-template-columns: 296px minmax(0, 1fr) 312px;
  }
}

/* 矮屏（768p 一类）：保证列表有可用高度，宁可让左栏整体滚动 */
@media (max-height: 900px) {
  .col-left > :nth-child(2) {
    min-height: 260px;
  }
}

@media (max-height: 800px) {
  .col-left > :nth-child(2) {
    min-height: 250px;
  }

  /* 右栏内容（事件详情 + AI 分析）在 768p 下装不进一屏，改为整列滚动而不是把内容裁掉 */
  .col-right {
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: thin;
  }

  .col-right > :nth-child(1) {
    flex: none;
  }

  .col-right > :nth-child(2) {
    flex: none;
    min-height: 322px;
  }
}
</style>

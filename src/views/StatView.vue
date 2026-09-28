<script setup>
import { computed } from 'vue'
import { useStatStore } from '../stores/stat'
import { chartBase, lineSeries, barSeries, CHART_COLORS } from '../composables/useChart'
import { percent, thousands } from '../utils/format'
import TopBar from '../components/layout/TopBar.vue'
import ChartPanel from '../components/stat/ChartPanel.vue'

const stat = useStatStore()

const AXIS_LABEL = { color: '#8d97a3', fontSize: 11 }

/* ---------------- 1. 交通状态识别 ---------------- */

const congestionOption = computed(() => {
  const rows = stat.congestionWithShare
  return {
    ...chartBase,
    grid: { left: 8, right: 44, top: 6, bottom: 2, containLabel: true },
    tooltip: { ...chartBase.tooltip, trigger: 'item', formatter: '{b}：{c} 次（{d}%）' },
    xAxis: { type: 'value', show: false },
    yAxis: {
      type: 'category',
      inverse: true,
      data: rows.map((row) => row.label),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: AXIS_LABEL,
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 14,
        data: rows.map((row) => ({ value: row.value, itemStyle: { color: row.color } })),
        itemStyle: { borderRadius: [0, 3, 3, 0] },
        label: {
          show: true,
          position: 'right',
          fontSize: 11,
          color: '#5a6572',
          formatter: (params) => `${thousands(params.value)} · ${rows[params.dataIndex].share}%`,
        },
      },
    ],
  }
})

const congestionTrendOption = computed(() => ({
  ...chartBase,
  xAxis: { ...chartBase.categoryAxis, data: stat.congestionTrend.hours, boundaryGap: false },
  yAxis: { ...chartBase.valueAxis, name: '拥堵指数', nameTextStyle: { color: '#8d97a3', fontSize: 10 }, max: 10 },
  series: [lineSeries('拥堵指数', stat.congestionTrend.values, CHART_COLORS[3])],
}))

/* ---------------- 2. 异常事件检测 ---------------- */

const abnormalOption = computed(() => {
  const rows = stat.abnormalDistribution
  return {
    ...chartBase,
    grid: { left: 8, right: 12, top: 16, bottom: 2, containLabel: true },
    tooltip: { ...chartBase.tooltip, trigger: 'axis' },
    xAxis: { ...chartBase.categoryAxis, data: rows.map((row) => row.label) },
    yAxis: { ...chartBase.valueAxis, name: '起', nameTextStyle: { color: '#8d97a3', fontSize: 10 } },
    series: [
      {
        type: 'bar',
        barMaxWidth: 26,
        data: rows.map((row) => ({ value: row.value, itemStyle: { color: row.color } })),
        itemStyle: { borderRadius: [3, 3, 0, 0] },
        label: { show: true, position: 'top', fontSize: 11, color: '#5a6572' },
      },
    ],
  }
})

const abnormalTrendOption = computed(() => ({
  ...chartBase,
  legend: {
    top: 0,
    right: 0,
    icon: 'roundRect',
    itemWidth: 8,
    itemHeight: 8,
    itemGap: 12,
    textStyle: { color: '#5a6572', fontSize: 11 },
  },
  grid: { left: 8, right: 12, top: 30, bottom: 2, containLabel: true },
  xAxis: { ...chartBase.categoryAxis, data: stat.abnormalTrend.days, boundaryGap: false },
  yAxis: { ...chartBase.valueAxis, name: '起', nameTextStyle: { color: '#8d97a3', fontSize: 10 } },
  series: [
    lineSeries('发现', stat.abnormalTrend.detected, CHART_COLORS[3]),
    lineSeries('处置', stat.abnormalTrend.disposed, CHART_COLORS[0], { area: false }),
  ],
}))

/* ---------------- 3. 交通违法取证 ---------------- */

const violationOption = computed(() => {
  const rows = [...stat.violationTop].reverse()
  return {
    ...chartBase,
    grid: { left: 8, right: 34, top: 6, bottom: 2, containLabel: true },
    tooltip: { ...chartBase.tooltip, trigger: 'item', formatter: '{b}：{c} 起' },
    xAxis: { type: 'value', show: false },
    yAxis: {
      type: 'category',
      data: rows.map((row) => row.label),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: AXIS_LABEL,
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 14,
        data: rows.map((row) => row.value),
        itemStyle: { color: CHART_COLORS[0], borderRadius: [0, 3, 3, 0] },
        label: { show: true, position: 'right', fontSize: 11, color: '#5a6572' },
      },
    ],
  }
})

const evidenceTrendOption = computed(() => ({
  ...chartBase,
  legend: {
    top: 0,
    right: 0,
    icon: 'roundRect',
    itemWidth: 8,
    itemHeight: 8,
    itemGap: 12,
    textStyle: { color: '#5a6572', fontSize: 11 },
  },
  grid: { left: 8, right: 12, top: 30, bottom: 2, containLabel: true },
  xAxis: { ...chartBase.categoryAxis, data: stat.evidenceTrend.days },
  yAxis: { ...chartBase.valueAxis, name: '条', nameTextStyle: { color: '#8d97a3', fontSize: 10 } },
  series: [
    barSeries('取证量', stat.evidenceTrend.captured, '#c9daf9'),
    barSeries('有效量', stat.evidenceTrend.valid, CHART_COLORS[0]),
  ],
}))

/* ---------------- 4. 机队运行 ---------------- */

const flightTrendOption = computed(() => ({
  ...chartBase,
  legend: {
    top: 0,
    right: 0,
    icon: 'roundRect',
    itemWidth: 8,
    itemHeight: 8,
    itemGap: 12,
    textStyle: { color: '#5a6572', fontSize: 11 },
  },
  grid: { left: 8, right: 12, top: 30, bottom: 2, containLabel: true },
  xAxis: { ...chartBase.categoryAxis, data: stat.flightTrend7d.days },
  yAxis: [
    { ...chartBase.valueAxis, name: '架次', nameTextStyle: { color: '#8d97a3', fontSize: 10 } },
    {
      ...chartBase.valueAxis,
      name: '小时',
      nameTextStyle: { color: '#8d97a3', fontSize: 10 },
      splitLine: { show: false },
    },
  ],
  series: [
    barSeries('飞行架次', stat.flightTrend7d.flights, '#c9daf9'),
    {
      ...lineSeries('航时', stat.flightTrend7d.hours, CHART_COLORS[1], { area: false }),
      yAxisIndex: 1,
    },
  ],
}))

const fleetOption = computed(() => {
  const rows = stat.fleetStats
  return {
    ...chartBase,
    grid: { left: 8, right: 12, top: 16, bottom: 2, containLabel: true },
    tooltip: { ...chartBase.tooltip, trigger: 'axis' },
    xAxis: { ...chartBase.categoryAxis, data: rows.map((row) => row.name) },
    yAxis: { ...chartBase.valueAxis, name: '架次', nameTextStyle: { color: '#8d97a3', fontSize: 10 } },
    series: [
      {
        type: 'bar',
        barMaxWidth: 26,
        data: rows.map((row, index) => ({
          value: row.flights,
          itemStyle: { color: CHART_COLORS[index % CHART_COLORS.length], borderRadius: [3, 3, 0, 0] },
        })),
        label: { show: true, position: 'top', fontSize: 11, color: '#5a6572' },
      },
    ],
  }
})
</script>

<template>
  <div class="stat-page">
    <TopBar />

    <div class="stat-body scroll-y">
      <div class="stat-inner">
        <header class="stat-header">
          <div>
            <h1 class="stat-title">统计分析</h1>
            <p class="stat-sub">
              数据口径：2024-09-20 单日（趋势类为近 7 日）· 数据来源：低空飞行采集与 AI 识别流水
            </p>
          </div>
          <div class="stat-kpis">
            <div class="stat-kpi">
              <span class="stat-kpi-label">取证有效率</span>
              <span class="stat-kpi-value num">{{ percent(stat.overview.evidenceValidRate) }}</span>
            </div>
            <div class="stat-kpi">
              <span class="stat-kpi-label">事件处置率</span>
              <span class="stat-kpi-value num">{{ percent(stat.overview.disposeRate) }}</span>
            </div>
            <div class="stat-kpi">
              <span class="stat-kpi-label">平均置信度</span>
              <span class="stat-kpi-value num">{{ percent(stat.overview.avgConfidence) }}</span>
            </div>
          </div>
        </header>

        <div class="capability-grid">
          <div v-for="card in stat.capabilityCards" :key="card.key" class="capability">
            <span class="capability-label">{{ card.label }}</span>
            <span class="capability-value num">
              {{ thousands(card.value) }}
              <em>{{ card.unit }}</em>
            </span>
            <span class="capability-foot">
              <span class="capability-delta" :class="`delta-${card.tone}`">{{ card.delta }}</span>
              <span class="capability-note">{{ card.note }}</span>
            </span>
          </div>
        </div>

        <!-- 交通状态识别 -->
        <section class="stat-section">
          <h2 class="section-title">交通状态识别</h2>
          <div class="chart-grid">
            <article class="card">
              <div class="card-head"><h3 class="card-title">路网拥堵等级分布</h3></div>
              <div class="card-body">
                <ChartPanel :option="congestionOption" :height="176" />
              </div>
            </article>
            <article class="card">
              <div class="card-head"><h3 class="card-title">24 小时拥堵指数</h3></div>
              <div class="card-body">
                <ChartPanel :option="congestionTrendOption" :height="176" />
              </div>
            </article>
          </div>
        </section>

        <!-- 异常事件检测 -->
        <section class="stat-section">
          <h2 class="section-title">异常事件检测</h2>
          <div class="chart-grid">
            <article class="card">
              <div class="card-head"><h3 class="card-title">事件类型分布</h3></div>
              <div class="card-body">
                <ChartPanel :option="abnormalOption" :height="176" />
              </div>
            </article>
            <article class="card">
              <div class="card-head"><h3 class="card-title">近 7 日发现与处置</h3></div>
              <div class="card-body">
                <ChartPanel :option="abnormalTrendOption" :height="176" />
              </div>
            </article>
          </div>
        </section>

        <!-- 交通违法取证 -->
        <section class="stat-section">
          <h2 class="section-title">交通违法取证</h2>
          <div class="chart-grid">
            <article class="card">
              <div class="card-head"><h3 class="card-title">违法类型 TOP5</h3></div>
              <div class="card-body">
                <ChartPanel :option="violationOption" :height="176" />
              </div>
            </article>
            <article class="card">
              <div class="card-head"><h3 class="card-title">近 7 日取证量与有效量</h3></div>
              <div class="card-body">
                <ChartPanel :option="evidenceTrendOption" :height="176" />
              </div>
            </article>
          </div>
        </section>

        <!-- 机队运行 -->
        <section class="stat-section">
          <h2 class="section-title">机队运行</h2>
          <div class="chart-grid">
            <article class="card">
              <div class="card-head"><h3 class="card-title">近 7 日飞行架次与航时</h3></div>
              <div class="card-body">
                <ChartPanel :option="flightTrendOption" :height="176" />
              </div>
            </article>
            <article class="card">
              <div class="card-head"><h3 class="card-title">各机队飞行架次对比</h3></div>
              <div class="card-body">
                <ChartPanel :option="fleetOption" :height="176" />
              </div>
            </article>
          </div>
        </section>

        <p class="stat-foot">
          说明：本页为纯前端演示，全部数值来自本地 mock 数据，未连接真实业务系统。
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stat-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.stat-body {
  flex: 1;
  min-height: 0;
  padding: var(--gap);
}

.stat-inner {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 1320px;
  margin: 0 auto;
}

.stat-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}

.stat-title {
  font-size: var(--fs-16);
  font-weight: 600;
}

.stat-sub {
  margin-top: 4px;
  font-size: var(--fs-12);
  color: var(--text-muted);
}

.stat-kpis {
  display: flex;
  gap: 10px;
}

.stat-kpi {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 92px;
  padding: 8px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-card);
}

.stat-kpi-label {
  font-size: var(--fs-11);
  color: var(--text-muted);
}

.stat-kpi-value {
  font-size: var(--fs-16);
  font-weight: 600;
}

/* ---- 能力卡 ---- */
.capability-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--gap);
}

.capability {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
}

.capability-label {
  font-size: var(--fs-12);
  color: var(--text-secondary);
}

.capability-value {
  font-size: var(--fs-26);
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.015em;
}

.capability-value em {
  font-size: var(--fs-12);
  font-style: normal;
  font-weight: 400;
  color: var(--text-muted);
}

.capability-foot {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-11);
}

.capability-delta {
  font-weight: 500;
}

.delta-up {
  color: var(--success);
}

.delta-down {
  color: var(--danger);
}

.capability-note {
  min-width: 0;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---- 图表区 ---- */
.stat-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  font-size: var(--fs-13);
  font-weight: 600;
  padding-left: 8px;
  border-left: 2px solid var(--accent);
}

.chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--gap);
}

.stat-foot {
  padding: 4px 0 12px;
  font-size: var(--fs-11);
  color: var(--text-muted);
  text-align: center;
}

@media (max-width: 1080px) {
  .capability-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .chart-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .stat-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

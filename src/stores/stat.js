/** 统计分析页状态。数据全部来自 mock/stats.js，这里只做展示口径的整理。 */

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { STATS } from '../mock'
import { AI_CATEGORY_LABEL } from '../domain/constants'

export const useStatStore = defineStore('stat', () => {
  const overview = ref(STATS.STAT_OVERVIEW)
  const congestionDistribution = ref(STATS.CONGESTION_DISTRIBUTION)
  const congestionTrend = ref(STATS.CONGESTION_TREND)
  const abnormalDistribution = ref(STATS.ABNORMAL_DISTRIBUTION)
  const abnormalTrend = ref(STATS.ABNORMAL_TREND)
  const violationTop = ref(STATS.VIOLATION_TOP)
  const evidenceTrend = ref(STATS.EVIDENCE_TREND)
  const fleetStats = ref(STATS.FLEET_STATS)
  const flightTrend7d = ref(STATS.FLIGHT_TREND_7D)

  /** 拥堵等级占比（分布条用） */
  const congestionTotal = computed(() =>
    congestionDistribution.value.reduce((sum, item) => sum + item.value, 0)
  )

  const congestionWithShare = computed(() =>
    congestionDistribution.value.map((item) => ({
      ...item,
      share: Number(((item.value / congestionTotal.value) * 100).toFixed(1)),
    }))
  )

  /** 四类能力卡（页面顶部） */
  const capabilityCards = computed(() => [
    {
      key: AI_CATEGORY_LABEL.traffic_state,
      label: AI_CATEGORY_LABEL.traffic_state,
      value: overview.value.recognitionTotal,
      unit: '次',
      delta: '+14%',
      tone: 'up',
      note: '路网通行状态识别总量',
    },
    {
      key: AI_CATEGORY_LABEL.abnormal_event,
      label: AI_CATEGORY_LABEL.abnormal_event,
      value: overview.value.abnormalTotal,
      unit: '起',
      delta: '-8%',
      tone: 'down',
      note: '异常事件发现量，环比下降',
    },
    {
      key: AI_CATEGORY_LABEL.violation,
      label: AI_CATEGORY_LABEL.violation,
      value: overview.value.violationTotal,
      unit: '起',
      delta: '+21%',
      tone: 'up',
      note: '违法取证记录，有效率 91%',
    },
    {
      key: 'fleet',
      label: '机队运行',
      value: flightTrend7d.value.flights.reduce((sum, v) => sum + v, 0),
      unit: '架次',
      delta: '+6%',
      tone: 'up',
      note: '近 7 日累计飞行架次',
    },
  ])

  return {
    overview,
    congestionDistribution,
    congestionWithShare,
    congestionTrend,
    abnormalDistribution,
    abnormalTrend,
    violationTop,
    evidenceTrend,
    fleetStats,
    flightTrend7d,
    capabilityCards,
  }
})

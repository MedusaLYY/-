/** 低空运行概览 KPI。全量口径，作用域口径由 store 依据筛选结果重算。 */

import { DRONES } from './drones'
import { TASKS } from './tasks'
import { TASK_DATA } from './taskData'
import { DRONE_STATUS } from '../domain/constants'

const onlineCount = DRONES.filter((drone) => drone.status === DRONE_STATUS.ONLINE).length
const executingCount = TASKS.filter((task) => task.status === 'executing').length
const totalDistance = TASK_DATA.reduce((sum, row) => sum + row.distanceKm, 0)
const totalDuration = TASK_DATA.reduce((sum, row) => sum + row.durationMin, 0)

/** 24 小时在线无人机曲线（用于 KPI 卡片的迷你走势） */
export const ONLINE_TREND = [
  12, 10, 9, 11, 14, 18, 22, 26, 28, 28, 27, 28, 26, 28, 28, 27, 28, 26, 22, 18, 16, 15, 14, 13,
]

/** 今日逐小时飞行架次 */
export const FLIGHT_TREND = [
  2, 1, 1, 2, 3, 6, 11, 14, 13, 10, 9, 11, 12, 10, 9, 8, 7, 4, 3, 0, 0, 0, 0, 0,
]

export const KPI = {
  onlineDrones: onlineCount,
  executingTasks: executingCount,
  todayFlights: 126,
  totalHours: 52.3,
  coverageKm: 342.6,
  deltas: {
    onlineDrones: 3,
    todayFlights: 0.12,
    totalHours: 0.08,
    coverageKm: 0.15,
  },
  /** 供作用域口径参考的原始汇总 */
  raw: {
    missionDistanceKm: Number(totalDistance.toFixed(1)),
    missionDurationMin: totalDuration,
  },
  trend: {
    onlineDrones: ONLINE_TREND,
    todayFlights: FLIGHT_TREND,
  },
}

/**
 * 不同时间范围下的运行概览口径。
 * 「近 7 天 / 近 30 天」的数值由 STATS 里的日趋势累加得到，保证与统计分析页同源。
 */
export const RANGE_KPI = {
  today: {
    label: '今日 00:00 - 23:59',
    flights: 126,
    hours: 52.3,
    distanceKm: 342.6,
    deltaFlights: '+12%',
    deltaHours: '+8%',
    deltaDistance: '+15%',
  },
  '7d': {
    label: '近 7 天',
    flights: 787,
    hours: 328.3,
    distanceKm: 2146.8,
    deltaFlights: '+6%',
    deltaHours: '+5%',
    deltaDistance: '+9%',
  },
  '30d': {
    label: '近 30 天',
    flights: 3412,
    hours: 1426.5,
    distanceKm: 9318.4,
    deltaFlights: '+4%',
    deltaHours: '+3%',
    deltaDistance: '+7%',
  },
}

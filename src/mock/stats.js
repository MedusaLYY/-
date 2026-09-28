/**
 * 统计分析页数据。
 * 口径说明：全部为 2024-09-20 单日（趋势类为近 7 日）的演示数据，
 * 数值之间保持自洽（如各拥堵等级占比之和为 100%）。
 */

import { CONGESTION_LEVEL, EVENT_TYPE } from '../domain/constants'

export const STAT_OVERVIEW = {
  recognitionTotal: 1842,
  abnormalTotal: 37,
  violationTotal: 64,
  evidenceValidRate: 0.91,
  disposeRate: 0.86,
  avgConfidence: 0.89,
  deltas: {
    recognitionTotal: 0.14,
    abnormalTotal: -0.08,
    violationTotal: 0.21,
  },
}

/** 交通状态识别 —— 拥堵等级分布 */
export const CONGESTION_DISTRIBUTION = [
  { level: CONGESTION_LEVEL.SMOOTH, label: '畅通', value: 1186, color: '#2e8a5a' },
  { level: CONGESTION_LEVEL.LIGHT, label: '轻度拥堵', value: 421, color: '#7ba428' },
  { level: CONGESTION_LEVEL.MEDIUM, label: '中度拥堵', value: 178, color: '#b8801c' },
  { level: CONGESTION_LEVEL.HEAVY, label: '严重拥堵', value: 57, color: '#cc4b4b' },
]

/** 交通状态识别 —— 24 小时路网拥堵指数（0~10） */
export const CONGESTION_TREND = {
  hours: ['00', '02', '04', '06', '08', '10', '12', '14', '16', '18', '20', '22'],
  values: [1.2, 0.9, 1.0, 2.4, 6.8, 5.1, 4.4, 5.6, 6.2, 7.4, 4.2, 2.1],
}

/** 异常事件检测 —— 事件类型分布 */
export const ABNORMAL_DISTRIBUTION = [
  { type: EVENT_TYPE.CONGESTION, label: '异常拥堵', value: 14, color: '#cc4b4b' },
  { type: EVENT_TYPE.ILLEGAL_PARKING, label: '疑似违停', value: 11, color: '#b8801c' },
  { type: EVENT_TYPE.WRONG_WAY, label: '逆行识别', value: 6, color: '#2f6feb' },
  { type: EVENT_TYPE.INTRUSION, label: '低空入侵', value: 4, color: '#7a5bd0' },
  { type: EVENT_TYPE.TASK_DONE, label: '任务完成', value: 2, color: '#2e8a5a' },
]

/** 异常事件检测 —— 近 7 日发现量 / 处置量 */
export const ABNORMAL_TREND = {
  days: ['09-14', '09-15', '09-16', '09-17', '09-18', '09-19', '09-20'],
  detected: [22, 28, 19, 31, 26, 34, 37],
  disposed: [19, 25, 18, 27, 23, 30, 32],
}

/** 交通违法取证 —— 违法类型 TOP5 */
export const VIOLATION_TOP = [
  { label: '违法停车', value: 26 },
  { label: '逆向行驶', value: 15 },
  { label: '占用应急车道', value: 11 },
  { label: '违反禁令标志', value: 8 },
  { label: '不按导向车道行驶', value: 4 },
]

/** 交通违法取证 —— 近 7 日取证量 / 有效量 */
export const EVIDENCE_TREND = {
  days: ['09-14', '09-15', '09-16', '09-17', '09-18', '09-19', '09-20'],
  captured: [41, 52, 38, 57, 49, 61, 64],
  valid: [37, 47, 35, 52, 44, 56, 58],
}

/** 机队运行 —— 各机队对比 */
export const FLEET_STATS = [
  { fleetId: 'FLT-PD', name: '浦东机队', flights: 42, hours: 18.6, distanceKm: 118.4, online: 8, total: 8 },
  { fleetId: 'FLT-HQ', name: '虹桥机队', flights: 34, hours: 14.2, distanceKm: 92.1, online: 7, total: 7 },
  { fleetId: 'FLT-JD', name: '嘉定机队', flights: 27, hours: 10.8, distanceKm: 71.6, online: 6, total: 7 },
  { fleetId: 'FLT-CM', name: '崇明机队', flights: 23, hours: 8.7, distanceKm: 60.5, online: 7, total: 8 },
]

/** 机队运行 —— 近 7 日飞行架次 */
export const FLIGHT_TREND_7D = {
  days: ['09-14', '09-15', '09-16', '09-17', '09-18', '09-19', '09-20'],
  flights: [98, 112, 87, 124, 109, 131, 126],
  hours: [41.2, 46.8, 36.4, 51.7, 45.3, 54.6, 52.3],
}

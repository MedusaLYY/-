/**
 * AI 识别结果。
 * 三类能力：交通状态识别 / 异常事件检测 / 交通违法取证。
 * 另有 runtimeAlert 标记「无人机运行异常」，对应面板上的「运行识别」指标。
 *
 * eventId 可为空——表示常态巡检识别结果，不对应具体告警事件。
 * 置信度只统计非空记录，因此「未发现异常事件」这类无置信度的记录不影响均值。
 */

import { AI_CATEGORY } from '../domain/constants'
import { LANDMARKS as L } from './anchors'
import { EVENTS } from './events'

const DATE = '2024-09-20'

/**
 * 识别结果流水（按时间倒序书写）。
 * 注意：事件面板上的「事件置信度」取该事件下所有非空置信度的均值，
 * EVT-001 的 5 条记录均值为 0.92，与设计稿一致。
 */
const RESULT_PLAN = [
  // ---------- 世纪大道 · 异常拥堵（EVT-001）----------
  { time: `${DATE}T14:24:05`, category: AI_CATEGORY.TRAFFIC_STATE, label: '中度拥堵', summary: '拥堵持续，排队长度增至 680 米', district: '浦东新区', road: '世纪大道', lngLat: L.世纪大道, confidence: 0.95, eventCode: 'EVT-001', droneId: 'SH-UAV-07', level: 'warn' },
  { time: `${DATE}T14:23:18`, category: AI_CATEGORY.TRAFFIC_STATE, label: '中度拥堵', summary: '检测到道路拥堵', district: '浦东新区', road: '世纪大道', lngLat: L.世纪大道, confidence: 0.94, eventCode: 'EVT-001', droneId: 'SH-UAV-07', level: 'warn' },
  { time: `${DATE}T14:22:41`, category: AI_CATEGORY.VIOLATION, label: '违法停车', summary: '识别到车辆违停', district: '浦东新区', road: '世纪大道', lngLat: L.世纪大道, confidence: 0.9, eventCode: 'EVT-001', droneId: 'SH-UAV-07', level: 'danger' },
  { time: `${DATE}T14:22:10`, category: AI_CATEGORY.ABNORMAL_EVENT, label: '异常停车', summary: '检测到车辆异常停车', district: '浦东新区', road: '世纪大道', lngLat: L.世纪大道, confidence: 0.92, eventCode: 'EVT-001', droneId: 'SH-UAV-07', level: 'warn' },
  { time: `${DATE}T14:21:33`, category: AI_CATEGORY.ABNORMAL_EVENT, label: '未发现异常事件', summary: '未发现异常事件', district: '浦东新区', road: '世纪大道', lngLat: L.世纪大道, confidence: null, eventCode: 'EVT-001', droneId: 'SH-UAV-07', level: 'neutral' },
  { time: `${DATE}T14:20:15`, category: AI_CATEGORY.VIOLATION, label: '违法停车', summary: '识别到车辆违停', district: '浦东新区', road: '世纪大道', lngLat: L.世纪大道, confidence: 0.89, eventCode: 'EVT-001', droneId: 'SH-UAV-07', level: 'danger' },
  { time: `${DATE}T14:18:52`, category: AI_CATEGORY.TRAFFIC_STATE, label: '轻度拥堵', summary: '检测到道路拥堵', district: '浦东新区', road: '世纪大道', lngLat: L.世纪大道, confidence: 0.84, eventCode: null, droneId: 'SH-UAV-07', level: 'warn' },

  // ---------- 南京西路 · 疑似违停（EVT-002）----------
  { time: `${DATE}T13:50:07`, category: AI_CATEGORY.VIOLATION, label: '违法停车', summary: '识别到车辆违停', district: '静安区', road: '南京西路', lngLat: L.南京西路, confidence: 0.87, eventCode: 'EVT-002', droneId: 'SH-UAV-10', level: 'danger' },
  { time: `${DATE}T13:48:22`, category: AI_CATEGORY.VIOLATION, label: '违法停车', summary: '车辆持续静止，抓拍第 2 帧', district: '静安区', road: '南京西路', lngLat: L.南京西路, confidence: 0.83, eventCode: 'EVT-002', droneId: 'SH-UAV-10', level: 'danger' },
  { time: `${DATE}T13:47:20`, category: AI_CATEGORY.TRAFFIC_STATE, label: '畅通', summary: '道路通行正常', district: '静安区', road: '南京西路', lngLat: L.南京西路, confidence: 0.95, eventCode: null, droneId: 'SH-UAV-10', level: 'ok' },

  // ---------- 沪闵路 · 逆行识别（EVT-003）----------
  { time: `${DATE}T11:17:42`, category: AI_CATEGORY.VIOLATION, label: '逆向行驶', summary: '识别到车辆逆行', district: '闵行区', road: '沪闵路', lngLat: L.沪闵路, confidence: 0.94, eventCode: 'EVT-003', droneId: 'SH-UAV-11', level: 'danger' },
  { time: `${DATE}T11:12:05`, category: AI_CATEGORY.ABNORMAL_EVENT, label: '异常停车', summary: '检测到车辆异常停车', district: '闵行区', road: '沪闵路', lngLat: L.沪闵路, confidence: 0.76, eventCode: 'EVT-003', droneId: 'SH-UAV-11', level: 'warn' },

  // ---------- 长江口 · 低空入侵（EVT-004）----------
  { time: `${DATE}T09:42:11`, category: AI_CATEGORY.ABNORMAL_EVENT, label: '低空入侵', summary: '检测到未报备飞行目标', district: '崇明区', road: '长江口', lngLat: L.长江口, confidence: 0.91, eventCode: 'EVT-004', droneId: 'SH-UAV-25', level: 'danger' },
  { time: `${DATE}T09:38:47`, category: AI_CATEGORY.ABNORMAL_EVENT, label: '未发现异常事件', summary: '未发现异常事件', district: '崇明区', road: '长江口', lngLat: L.长江口, confidence: null, eventCode: 'EVT-004', droneId: 'SH-UAV-25', level: 'neutral' },

  // ---------- 龙华中路 · 任务完成（EVT-005）----------
  { time: `${DATE}T08:16:33`, category: AI_CATEGORY.TRAFFIC_STATE, label: '畅通', summary: '道路通行正常', district: '徐汇区', road: '龙华中路', lngLat: L.龙华中路, confidence: 0.96, eventCode: 'EVT-005', droneId: 'SH-UAV-12', level: 'ok' },

  // ---------- 常态巡检识别（不绑定告警事件）----------
  { time: `${DATE}T14:11:09`, category: AI_CATEGORY.TRAFFIC_STATE, label: '严重拥堵', summary: '检测到道路拥堵', district: '虹口区', road: '四平路', lngLat: L.平凉路, confidence: 0.88, eventCode: null, droneId: 'SH-UAV-13', level: 'danger' },
  { time: `${DATE}T13:26:31`, category: AI_CATEGORY.VIOLATION, label: '占用应急车道', summary: '识别到占用应急车道', district: '嘉定区', road: '博乐路', lngLat: L.嘉定新城, confidence: 0.82, eventCode: null, droneId: 'SH-UAV-17', level: 'danger' },
  { time: `${DATE}T12:54:16`, category: AI_CATEGORY.ABNORMAL_EVENT, label: '道路施工', summary: '检测到未报备道路施工', district: '宝山区', road: '牡丹江路', lngLat: L.宝山城区, confidence: 0.79, eventCode: null, droneId: 'SH-UAV-20', level: 'warn' },
  { time: `${DATE}T11:48:02`, category: AI_CATEGORY.TRAFFIC_STATE, label: '轻度拥堵', summary: '检测到道路拥堵', district: '崇明区', road: '陈海公路', lngLat: L.堡镇, confidence: 0.86, eventCode: null, droneId: 'SH-UAV-23', level: 'warn' },
  { time: `${DATE}T10:33:55`, category: AI_CATEGORY.VIOLATION, label: '违法停车', summary: '识别到车辆违停', district: '金山区', road: '亭卫公路', lngLat: L.亭林, confidence: 0.85, eventCode: null, droneId: 'SH-UAV-28', level: 'danger' },
  // 无人机自身运行异常：对应任务 TASK-0894（载荷故障返航）
  { time: `${DATE}T11:02:40`, category: AI_CATEGORY.ABNORMAL_EVENT, label: '载荷运行异常', summary: '无人机载荷自检失败，已触发返航', district: '宝山区', road: '沪太路', lngLat: L.顾村, confidence: 0.93, eventCode: null, droneId: 'SH-UAV-19', level: 'danger', runtimeAlert: true },
]

const EVENT_ID_BY_CODE = new Map(EVENTS.map((event) => [event.code, event.id]))

export const AI_RESULTS = RESULT_PLAN.map((plan, index) => ({
  id: `AI-${String(index + 1).padStart(3, '0')}`,
  detectedAt: plan.time,
  category: plan.category,
  label: plan.label,
  summary: plan.summary,
  confidence: plan.confidence,
  district: plan.district,
  road: plan.road,
  lngLat: plan.lngLat,
  droneId: plan.droneId,
  level: plan.level,
  runtimeAlert: Boolean(plan.runtimeAlert),
  eventId: plan.eventCode ? EVENT_ID_BY_CODE.get(plan.eventCode) || null : null,
  eventCode: plan.eventCode,
}))

/** 平均置信度（忽略无置信度的记录） */
export function averageConfidence(rows) {
  const valid = rows.filter((row) => typeof row.confidence === 'number')
  if (!valid.length) return 0
  const sum = valid.reduce((acc, row) => acc + row.confidence, 0)
  return Number((sum / valid.length).toFixed(2))
}

/** 置信度文案 */
export function confidenceText(value) {
  if (value >= 0.9) return '识别结果可信度高'
  if (value >= 0.8) return '识别结果可信度中'
  return '识别结果可信度偏低'
}

/**
 * 把一组识别结果聚合成 AI 面板上的指标。
 * @param {Array} rows 当前作用域下的识别结果
 */
export function summarizeAiResults(rows) {
  const latestTraffic = rows.find((row) => row.category === AI_CATEGORY.TRAFFIC_STATE)
  const anomalies = rows.filter(
    (row) =>
      row.category === AI_CATEGORY.ABNORMAL_EVENT && (row.level === 'warn' || row.level === 'danger')
  )
  const violations = rows.filter((row) => row.category === AI_CATEGORY.VIOLATION)
  const runtime = rows.filter((row) => row.runtimeAlert)
  const confidence = averageConfidence(rows)

  return {
    congestionLevel: latestTraffic ? latestTraffic.label : '暂无数据',
    abnormalCount: anomalies.length,
    violationCount: violations.length,
    runtimeCount: runtime.length,
    confidence,
    confidenceText: confidence ? confidenceText(confidence) : '暂无可信度样本',
  }
}

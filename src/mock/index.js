/**
 * mock 数据聚合出口。
 * 组件与 store 一律从这里取数，不直接 import 各实体文件，便于后续替换为真实接口。
 */

import { DISTRICT_CENTERS, LANDMARKS } from './anchors'
import { FLEETS, FLEET_OPTIONS } from './fleets'
import { DRONES, FLEET_SUMMARY, droneById } from './drones'
import { ROUTES, routeById } from './routes'
import { TASKS, taskByCode, taskById, tasksByDrone } from './tasks'
import { EVENTS, eventById } from './events'
import { TASK_DATA, DATA_ASSETS, ASSET_SUMMARY, taskDataByTaskId, assetsByTaskId } from './taskData'
import { EVIDENCE, evidenceByEventId, verifyEvidenceChain } from './evidence'
import { AI_RESULTS, averageConfidence, confidenceText, summarizeAiResults } from './aiResults'
import { MISSION_AREAS, areasByTaskId } from './missionAreas'
import { TRAFFIC_ZONES } from './trafficZones'
import { AIRSPACES, airspaceById } from './airspaces'
import { KPI, RANGE_KPI } from './kpi'
import {
  blobPolygon,
  createRandom,
  deriveDetourSegments,
  pointInPolygon,
  rectPolygon,
  smoothPath,
  polylineLength,
} from './geometry'
import {
  ACCESS_LEVEL,
  APPROVAL_ACTION,
  APPROVAL_STATUS,
  AVOID_STRATEGY,
  SHANGHAI_VIEW,
  STORAGE_TIER,
  TASK_STATUS,
  TRANSMISSION_STATUS,
} from '../domain/constants'
import * as STATS from './stats'

export {
  DISTRICT_CENTERS,
  LANDMARKS,
  FLEETS,
  FLEET_OPTIONS,
  FLEET_SUMMARY,
  DRONES,
  ROUTES,
  TASKS,
  EVENTS,
  TASK_DATA,
  DATA_ASSETS,
  ASSET_SUMMARY,
  EVIDENCE,
  AI_RESULTS,
  MISSION_AREAS,
  TRAFFIC_ZONES,
  AIRSPACES,
  KPI,
  RANGE_KPI,
  STATS,
  droneById,
  routeById,
  taskById,
  taskByCode,
  tasksByDrone,
  eventById,
  taskDataByTaskId,
  assetsByTaskId,
  evidenceByEventId,
  areasByTaskId,
  averageConfidence,
  confidenceText,
  summarizeAiResults,
  smoothPath,
  polylineLength,
  deriveDetourSegments,
  pointInPolygon,
  blobPolygon,
  rectPolygon,
  createRandom,
  airspaceById,
  verifyEvidenceChain,
}

/* ---------------- 外键一致性自检 ---------------- */

/**
 * 开发期自检：验证 mock 数据的外键链是否完整。
 * event → task → drone / route，taskData / evidence / aiResult / missionArea → task。
 * 只打印警告，不抛错，避免影响演示。
 */
export function checkDataIntegrity() {
  const problems = []
  const droneIds = new Set(DRONES.map((item) => item.id))
  const routeIds = new Set(ROUTES.map((item) => item.id))
  const taskIds = new Set(TASKS.map((item) => item.id))
  const eventIds = new Set(EVENTS.map((item) => item.id))

  TASKS.forEach((task) => {
    if (!droneIds.has(task.droneId)) problems.push(`任务 ${task.code} 的无人机 ${task.droneId} 不存在`)
    if (!routeIds.has(task.routeId)) problems.push(`任务 ${task.code} 的航线 ${task.routeId} 不存在`)
  })

  const taskCodes = new Set(TASKS.map((item) => item.code))
  const usedRoutes = new Set()
  TASKS.forEach((task) => {
    if (usedRoutes.has(task.routeId)) problems.push(`航线 ${task.routeId} 被多个任务复用`)
    usedRoutes.add(task.routeId)
  })
  if (TASKS.length !== ROUTES.length) {
    problems.push(`任务数 ${TASKS.length} 与航线数 ${ROUTES.length} 不一致`)
  }

  EVENTS.forEach((event) => {
    if (!taskIds.has(event.taskId)) problems.push(`事件 ${event.code} 的任务 ${event.taskId} 不存在`)
    if (!droneIds.has(event.droneId)) problems.push(`事件 ${event.code} 的无人机 ${event.droneId} 不存在`)
    if (!taskCodes.has(event.taskCode)) problems.push(`事件 ${event.code} 的任务编号 ${event.taskCode} 不存在`)
  })

  TASK_DATA.forEach((row) => {
    if (!taskIds.has(row.taskId)) problems.push(`任务数据 ${row.id} 的任务 ${row.taskId} 不存在`)
  })

  DATA_ASSETS.forEach((row) => {
    if (!taskIds.has(row.taskId)) problems.push(`数据资产 ${row.id} 的任务 ${row.taskId} 不存在`)
  })

  EVIDENCE.forEach((row) => {
    if (!eventIds.has(row.eventId)) problems.push(`取证记录 ${row.code} 的事件 ${row.eventId} 不存在`)
  })

  AI_RESULTS.forEach((row) => {
    if (row.eventId && !eventIds.has(row.eventId)) {
      problems.push(`识别结果 ${row.id} 的事件 ${row.eventId} 不存在`)
    }
  })

  MISSION_AREAS.forEach((row) => {
    if (!taskIds.has(row.taskId)) problems.push(`任务区域 ${row.id} 的任务 ${row.taskId} 不存在`)
  })

  // 每架无人机最多挂一个执行中任务
  const busy = new Map()
  TASKS.filter((task) => task.status === 'executing').forEach((task) => {
    if (busy.has(task.droneId)) {
      problems.push(`无人机 ${task.droneId} 同时被多个执行中任务占用`)
    }
    busy.set(task.droneId, task.id)
  })

  /* ---------------- 空域 ---------------- */

  const districtNames = new Set(Object.keys(DISTRICT_CENTERS))
  const airspaceCodes = new Set()
  AIRSPACES.forEach((item) => {
    if (!districtNames.has(item.district)) {
      problems.push(`空域 ${item.code} 的所属区 ${item.district} 不存在`)
    }
    if (airspaceCodes.has(item.code)) problems.push(`空域编号 ${item.code} 重复`)
    airspaceCodes.add(item.code)
    if (!item.polygon || item.polygon.length < 3) {
      problems.push(`空域 ${item.code} 的多边形少于 3 个顶点`)
    }
  })

  /* ---------------- 任务审批 ---------------- */

  const approvalValues = new Set(Object.values(APPROVAL_STATUS))
  const approvalActions = new Set(Object.values(APPROVAL_ACTION))

  TASKS.forEach((task) => {
    if (!approvalValues.has(task.approvalStatus)) {
      problems.push(`任务 ${task.code} 的审批状态 ${task.approvalStatus} 非法`)
    }
    // 门禁：执行中的任务必须已通过审批
    if (task.status === TASK_STATUS.EXECUTING && task.approvalStatus !== APPROVAL_STATUS.APPROVED) {
      problems.push(`任务 ${task.code} 处于执行中但审批状态为 ${task.approvalStatus}`)
    }
    // 已通过的任务必须有 approve 记录，否则状态与记录不自洽
    if (
      task.approvalStatus === APPROVAL_STATUS.APPROVED &&
      !task.approvalRecords.some((record) => record.action === APPROVAL_ACTION.APPROVE)
    ) {
      problems.push(`任务 ${task.code} 审批已通过但缺少 approve 记录`)
    }
    task.approvalRecords.forEach((record) => {
      if (!approvalActions.has(record.action)) {
        problems.push(`任务 ${task.code} 的审批记录 ${record.id} 动作 ${record.action} 非法`)
      }
    })
  })

  /* ---------------- 航线的避障与返航 ---------------- */

  const avoidValues = new Set(Object.values(AVOID_STRATEGY))
  const [[minLat, minLng], [maxLat, maxLng]] = SHANGHAI_VIEW.bounds

  ROUTES.forEach((route) => {
    if (!avoidValues.has(route.avoidStrategy)) {
      problems.push(`航线 ${route.code} 的避障策略 ${route.avoidStrategy} 非法`)
    }
    const [rLng, rLat] = route.returnPoint
    if (rLng < minLng || rLng > maxLng || rLat < minLat || rLat > maxLat) {
      problems.push(`航线 ${route.code} 的返航点超出上海视野`)
    }
    route.detourSegments.forEach((segment, segIndex) => {
      if (!segment.points || segment.points.length < 2) {
        problems.push(`航线 ${route.code} 的第 ${segIndex + 1} 个绕行段点数不足`)
      }
    })
  })

  /* ---------------- 数据资产的回传 / 存储 / 权限 ---------------- */

  const transmissionValues = new Set(Object.values(TRANSMISSION_STATUS))
  const tierValues = new Set(Object.values(STORAGE_TIER))
  const accessValues = new Set(Object.values(ACCESS_LEVEL))

  DATA_ASSETS.forEach((row) => {
    if (!transmissionValues.has(row.transmission)) {
      problems.push(`数据资产 ${row.id} 的回传状态 ${row.transmission} 非法`)
    }
    if (!tierValues.has(row.storageTier)) {
      problems.push(`数据资产 ${row.id} 的存储分层 ${row.storageTier} 非法`)
    }
    if (!accessValues.has(row.accessLevel)) {
      problems.push(`数据资产 ${row.id} 的访问密级 ${row.accessLevel} 非法`)
    }
    if (row.progress < 0 || row.progress > 100) {
      problems.push(`数据资产 ${row.id} 的回传进度 ${row.progress} 越界`)
    }
    if (row.transmission === TRANSMISSION_STATUS.SYNCED && !row.transmittedAt) {
      problems.push(`数据资产 ${row.id} 已回传但缺少回传时间`)
    }
  })

  /* ---------------- 取证哈希链 ---------------- */

  const chain = [...EVIDENCE].sort((a, b) => a.blockHeight - b.blockHeight)
  chain.forEach((row, index) => {
    const expectedPrev = index === 0 ? null : chain[index - 1].hash
    if (row.prevHash !== expectedPrev) {
      problems.push(`取证 ${row.code} 的前序哈希与上一条不匹配`)
    }
    if (index > 0 && row.blockHeight <= chain[index - 1].blockHeight) {
      problems.push(`取证 ${row.code} 的区块高度未严格递增`)
    }
  })

  if (problems.length) {
    console.warn('[mock] 数据一致性检查发现问题：\n' + problems.join('\n'))
  }
  return problems
}

/** 模拟接口延迟，让加载态在演示中可见 */
export function delay(ms = 120) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

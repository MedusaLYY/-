/**
 * 数据自检脚本：验证 mock 数据的外键链与规模。
 * 用法：npm run check:data
 * 说明：mock 数据是「事件 → 任务 → 无人机 / 航线」这条链路的唯一来源，
 * 一旦外键断裂，页面上会出现空白面板，所以在构建前先跑一遍。
 */

import {
  checkDataIntegrity,
  DRONES,
  TASKS,
  ROUTES,
  EVENTS,
  TASK_DATA,
  DATA_ASSETS,
  EVIDENCE,
  AI_RESULTS,
  MISSION_AREAS,
  TRAFFIC_ZONES,
  AIRSPACES,
  KPI,
  FLEET_SUMMARY,
  verifyEvidenceChain,
} from '../src/mock/index.js'

const problems = checkDataIntegrity()

console.log('=== 外键一致性 ===')
console.log(problems.length ? problems.join('\n') : '通过，未发现问题')

console.log('\n=== 数据规模 ===')
console.log(
  '机队',
  FLEET_SUMMARY.length,
  FLEET_SUMMARY.map((f) => `${f.name} ${f.onlineCount}/${f.droneCount} 在线 · ${f.onMissionCount} 执行中`).join(' | ')
)
console.log('无人机', DRONES.length, '· 在线', DRONES.filter((d) => d.status === 'online').length)
console.log('任务', TASKS.length, '· 执行中', TASKS.filter((t) => t.status === 'executing').length)
console.log('航线', ROUTES.length, '· 事件', EVENTS.length)
console.log('任务数据', TASK_DATA.length, '· 数据资产', DATA_ASSETS.length, '· 取证', EVIDENCE.length)
console.log('AI 识别结果', AI_RESULTS.length, '· 任务区域', MISSION_AREAS.length, '· 交通航区', TRAFFIC_ZONES.length)
console.log('空域', AIRSPACES.length, '· 其中自定义', AIRSPACES.filter((a) => a.isCustom).length)

function tally(rows, key) {
  const out = {}
  rows.forEach((row) => {
    out[row[key]] = (out[row[key]] || 0) + 1
  })
  return JSON.stringify(out)
}

console.log('\n=== 空域类型分布 ===')
console.log(tally(AIRSPACES, 'category'))

console.log('\n=== 审批状态分布（与执行状态正交）===')
console.log(tally(TASKS, 'approvalStatus'))
console.log(
  '执行中且已审批',
  TASKS.filter((t) => t.status === 'executing' && t.approvalStatus === 'approved').length
)

console.log('\n=== 数据资产：回传 / 存储 / 密级分布 ===')
console.log('回传', tally(DATA_ASSETS, 'transmission'))
console.log('存储', tally(DATA_ASSETS, 'storageTier'))
console.log('密级', tally(DATA_ASSETS, 'accessLevel'))

console.log('\n=== 取证存证链 ===')
const chainResult = verifyEvidenceChain(EVIDENCE)
console.log(
  `链标识 ${EVIDENCE[0]?.chainId} · 环数 ${chainResult.total} · 校验 ${
    chainResult.valid ? '通过' : '失败'
  }${chainResult.brokenAt ? ` · 断点 ${chainResult.brokenAt}` : ''}`
)
EVIDENCE.forEach((row) => {
  console.log(
    `  #${row.blockHeight} ${row.code} ${row.eventCode} ${row.capturedAt} ` +
      `hash ${row.hash.slice(0, 14)}… prev ${
        row.prevHash ? `${row.prevHash.slice(0, 14)}…` : '创世区块'
      }`
  )
})

console.log('\n=== 航线避障与返航（前 5 条）===')
ROUTES.slice(0, 5).forEach((route) => {
  console.log(
    `${route.code} 高度${route.altitude}m 避障=${route.avoidStrategy} ` +
      `返航点=${route.returnPointName}(${route.returnMode}) 绕行段${route.detourSegments.length}`
  )
})

console.log('\n=== KPI ===')
console.log(
  JSON.stringify({
    onlineDrones: KPI.onlineDrones,
    executingTasks: KPI.executingTasks,
    todayFlights: KPI.todayFlights,
    totalHours: KPI.totalHours,
    coverageKm: KPI.coverageKm,
  })
)

console.log('\n=== 事件筛选链路（核心交互的数据基础）===')
for (const event of EVENTS) {
  const task = TASKS.find((t) => t.id === event.taskId)
  const route = ROUTES.find((r) => r.id === event.routeId)
  const drone = DRONES.find((d) => d.id === event.droneId)
  console.log(
    `${event.code} ${event.district}/${event.road} → ${event.droneId}(${drone.status} 电量${drone.battery}%) ` +
      `→ ${task.code} ${task.status} ${task.progress}% → ${route.code} ${route.distanceKm}km/${route.durationMin}min ` +
      `轨迹点${route.path.length} 当前位置[${drone.lngLat.map((v) => v.toFixed(4)).join(', ')}]`
  )
}

console.log('\n=== 航线坐标包络（应落在上海视野 120.8~122.2E / 30.6~31.95N）===')
const points = ROUTES.flatMap((r) => r.path)
const lngs = points.map((p) => p[0])
const lats = points.map((p) => p[1])
console.log(
  `lng ${Math.min(...lngs).toFixed(4)} ~ ${Math.max(...lngs).toFixed(4)} | lat ${Math.min(...lats).toFixed(
    4
  )} ~ ${Math.max(...lats).toFixed(4)}`
)

process.exit(problems.length ? 1 : 0)

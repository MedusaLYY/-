/**
 * 任务数据 / 数据管理。
 * TASK_DATA  —— 每个任务的飞行数据汇总（航时、里程、最大高度、载荷产出等）
 * DATA_ASSETS —— 每个任务沉淀的数据资产条目（影像 / 视频 / 取证 / 日志），对应「数据管理」Tab
 */

import { TASKS } from './tasks'
import { ROUTES } from './routes'
import { createRandom } from './geometry'
import { fakeHash } from './hash'
import {
  ACCESS_LEVEL,
  LINK_QUALITY,
  STORAGE_TIER,
  TRANSMISSION_STATUS,
} from '../domain/constants'

const rand = createRandom(19880910)

const QUALITIES = ['good', 'good', 'good', 'fair', 'poor']

export const TASK_DATA = TASKS.map((task, index) => {
  const route = ROUTES.find((item) => item.id === task.routeId)
  const ratio = task.progress / 100
  const durationMin = Math.max(1, Math.round(route.durationMin * ratio))
  const distanceKm = Number((route.distanceKm * ratio).toFixed(1))
  const photos = Math.round(distanceKm * (6 + rand() * 6))
  const videoMinutes = Number((durationMin * (0.5 + rand() * 0.4)).toFixed(1))

  return {
    id: `DATA-${String(index + 1).padStart(2, '0')}`,
    taskId: task.id,
    taskCode: task.code,
    taskName: task.name,
    droneId: task.droneId,
    routeId: route.id,
    routeName: route.name,
    date: '2024-09-20',
    durationMin,
    distanceKm,
    maxAltitude: 90 + Math.round(rand() * 60),
    avgSpeed: Number((6 + rand() * 5).toFixed(1)),
    batteryUsed: Math.min(96, 12 + Math.round(ratio * 70)),
    photos,
    videoMinutes,
    dataSizeMb: Number((photos * 8.4 + videoMinutes * 96).toFixed(0)),
    quality: QUALITIES[Math.floor(rand() * QUALITIES.length)],
    district: task.district,
    road: task.road,
  }
})

const ASSET_CATEGORIES = [
  { key: 'image', label: '影像资料', unit: '张', sizePerUnit: 8.4 },
  { key: 'video', label: '视频片段', unit: '分钟', sizePerUnit: 96 },
  { key: 'evidence', label: '取证记录', unit: '条', sizePerUnit: 12 },
  { key: 'log', label: '飞行日志', unit: '份', sizePerUnit: 1.2 },
]

/* ---------------- 回传 / 存储 / 权限 / 检索的派生规则 ---------------- */

/** 回传状态：绝大多数已回传，留少量回传中 / 排队 / 失败做演示样本 */
function transmissionOf(taskIndex, categoryKey) {
  if (taskIndex % 11 === 3 && categoryKey === 'image') return TRANSMISSION_STATUS.UPLOADING
  if (taskIndex % 13 === 5 && categoryKey === 'video') return TRANSMISSION_STATUS.FAILED
  if (taskIndex % 17 === 7 && categoryKey === 'log') return TRANSMISSION_STATUS.QUEUED
  return TRANSMISSION_STATUS.SYNCED
}

const TIER_BY_CATEGORY = {
  image: STORAGE_TIER.HOT,
  video: STORAGE_TIER.WARM,
  evidence: STORAGE_TIER.EVIDENCE,
  log: STORAGE_TIER.COLD,
}

/** 密级按类别分：取证最高、日志最低，这样角色切换的可见性差异最明显 */
const ACCESS_BY_CATEGORY = {
  image: ACCESS_LEVEL.INTERNAL,
  video: ACCESS_LEVEL.RESTRICTED,
  evidence: ACCESS_LEVEL.CONFIDENTIAL,
  log: ACCESS_LEVEL.PUBLIC,
}

const RETENTION_BY_CATEGORY = {
  image: 90,
  video: 180,
  evidence: 365,
  log: 30,
}

const LINK_BY_TRANSMISSION = {
  [TRANSMISSION_STATUS.SYNCED]: LINK_QUALITY.STRONG,
  [TRANSMISSION_STATUS.UPLOADING]: LINK_QUALITY.MEDIUM,
  [TRANSMISSION_STATUS.QUEUED]: LINK_QUALITY.MEDIUM,
  [TRANSMISSION_STATUS.FAILED]: LINK_QUALITY.WEAK,
}

/** 数据校验和：确定性 hex，展示时前面拼 sha256: 前缀 */
function fakeChecksum(input, length = 64) {
  return fakeHash(input, length).slice(2)
}

function addDays(iso, days) {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(
    d.getMinutes()
  )}:${p(d.getSeconds())}`
}

/** 数据资产：由任务数据派生，保证与飞行记录同源 */
export const DATA_ASSETS = TASK_DATA.flatMap((data, taskIndex) => {
  const base = {
    image: data.photos,
    video: data.videoMinutes,
    evidence: Math.max(1, Math.round(data.photos / 42)),
    log: 1,
  }
  return ASSET_CATEGORIES.map((category, categoryIndex) => {
    const amount = base[category.key]
    const id = `ASSET-${String(taskIndex + 1).padStart(2, '0')}-${category.key}`
    const createdAt = `2024-09-20T${String(8 + (taskIndex % 7)).padStart(2, '0')}:${String(
      (categoryIndex * 13) % 60
    ).padStart(2, '0')}:00`

    const transmission = transmissionOf(taskIndex, category.key)
    const progress =
      transmission === TRANSMISSION_STATUS.SYNCED
        ? 100
        : transmission === TRANSMISSION_STATUS.UPLOADING
          ? 40 + ((taskIndex * 7) % 45)
          : transmission === TRANSMISSION_STATUS.FAILED
            ? 30
            : 0

    const retentionDays = RETENTION_BY_CATEGORY[category.key]

    return {
      id,
      taskId: data.taskId,
      taskCode: data.taskCode,
      taskName: data.taskName,
      droneId: data.droneId,
      category: category.key,
      categoryLabel: category.label,
      unit: category.unit,
      amount: typeof amount === 'number' ? Number(amount.toFixed(1)) : amount,
      sizeMb: Number((amount * category.sizePerUnit).toFixed(1)),
      storage: category.key === 'evidence' ? '取证存储池' : '飞行数据湖',
      createdAt,
      status: '已归档',
      // ---- 数据回传 ----
      transmission,
      progress,
      linkQuality: LINK_BY_TRANSMISSION[transmission],
      bandwidthMbps: Number((18 + (taskIndex % 7) * 6 + categoryIndex * 2.5).toFixed(1)),
      transmittedAt: transmission === TRANSMISSION_STATUS.SYNCED ? createdAt : null,
      retryCount:
        transmission === TRANSMISSION_STATUS.FAILED
          ? 3
          : transmission === TRANSMISSION_STATUS.QUEUED
            ? 1
            : 0,
      // ---- 存储分层 ----
      storageTier: TIER_BY_CATEGORY[category.key],
      retentionDays,
      expireAt: addDays(createdAt, retentionDays),
      // ---- 权限 ----
      accessLevel: ACCESS_BY_CATEGORY[category.key],
      ownerOrg:
        category.key === 'evidence' ? '上海市交通管理局执法总队' : '上海市交通管理局',
      // ---- 检索 ----
      tags: [data.district, data.road, category.label],
      checksum: `sha256:${fakeChecksum(id + data.taskCode)}`,
    }
  })
})

/** 数据资产按类别汇总（数据管理 Tab 顶部概览用） */
export const ASSET_SUMMARY = ASSET_CATEGORIES.map((category) => {
  const rows = DATA_ASSETS.filter((asset) => asset.category === category.key)
  return {
    key: category.key,
    label: category.label,
    unit: category.unit,
    amount: Number(rows.reduce((sum, row) => sum + row.amount, 0).toFixed(1)),
    sizeMb: Number(rows.reduce((sum, row) => sum + row.sizeMb, 0).toFixed(0)),
    count: rows.length,
  }
})

export function taskDataByTaskId(taskId) {
  return TASK_DATA.filter((row) => row.taskId === taskId)
}

export function assetsByTaskId(taskId) {
  return DATA_ASSETS.filter((row) => row.taskId === taskId)
}

/**
 * 空域：禁飞区 / 限飞区 / 电子围栏 / 航路走廊。
 *
 * 与 trafficZones.js（交通航区）的区别：
 *   交通航区是「航区等级」（管控 / 报备 / 自由），静态只读；
 *   空域是「管制类型 + 管控强度」两个正交维度，且支持页面增删改。
 *   两者多边形结构对齐，所以地图渲染可以直接复用同一套骨架。
 *
 * 多边形一律由几何工具生成、不手写坐标，且不闭合（首尾不重复）。
 */

import { AIRSPACE_CATEGORY, AIRSPACE_CATEGORY_COLOR, AIRSPACE_LEVEL, AIRSPACE_STATUS } from '../domain/constants'
import { LANDMARKS as L } from './anchors'
import { blobPolygon, rectPolygon, createRandom } from './geometry'

const rand = createRandom(20240404)

function round(polygon) {
  return polygon.map(([lng, lat]) => [Number(lng.toFixed(6)), Number(lat.toFixed(6))])
}

/**
 * 按类型生成多边形。
 * 航路走廊是长条形，用矩形；其余三种是不规则多边形，用 blob。
 */
function buildPolygon(plan) {
  if (plan.category === AIRSPACE_CATEGORY.CORRIDOR) {
    // 走廊沿黄浦江呈南北走向：东西窄、南北长
    return round(rectPolygon(plan.center, plan.radiusKm, plan.radiusKm * 5))
  }
  return round(blobPolygon(plan.center, plan.radiusKm, plan.sides, rand))
}

const AIRSPACE_PLAN = [
  {
    code: 'ASP-01',
    name: '陆家嘴核心禁飞区',
    category: AIRSPACE_CATEGORY.NO_FLY,
    level: AIRSPACE_LEVEL.HIGH,
    district: '浦东新区',
    center: L.世纪大道,
    radiusKm: 3.2,
    sides: 4,
    altitudeFloor: 0,
    altitudeLimit: 0,
    effectiveFrom: '2024-09-01T00:00:00',
    effectiveTo: '2024-12-31T23:59:59',
    status: AIRSPACE_STATUS.ACTIVE,
    owner: '上海市交通管理局',
    remark: '陆家嘴核心区，全时段、全高度禁止未报备飞行',
  },
  {
    code: 'ASP-02',
    name: '虹桥机场净空禁飞区',
    category: AIRSPACE_CATEGORY.NO_FLY,
    level: AIRSPACE_LEVEL.HIGH,
    district: '闵行区',
    center: L.虹桥机场,
    radiusKm: 5.5,
    sides: 6,
    altitudeFloor: 0,
    altitudeLimit: 0,
    effectiveFrom: '2024-01-01T00:00:00',
    effectiveTo: '2025-12-31T23:59:59',
    status: AIRSPACE_STATUS.ACTIVE,
    owner: '民航华东地区管理局',
    remark: '机场净空保护区，禁止任何未经批准的无人机活动',
  },
  {
    code: 'ASP-03',
    name: '浦东机场限飞区',
    category: AIRSPACE_CATEGORY.RESTRICTED,
    level: AIRSPACE_LEVEL.HIGH,
    district: '浦东新区',
    center: L.浦东机场,
    radiusKm: 6.8,
    sides: 5,
    altitudeFloor: 0,
    altitudeLimit: 60,
    effectiveFrom: '2024-01-01T00:00:00',
    effectiveTo: '2025-12-31T23:59:59',
    status: AIRSPACE_STATUS.ACTIVE,
    owner: '民航华东地区管理局',
    remark: '限高 60 米，超出需提前 48 小时报批',
  },
  {
    code: 'ASP-04',
    name: '宝山沿江限飞区',
    category: AIRSPACE_CATEGORY.RESTRICTED,
    level: AIRSPACE_LEVEL.MEDIUM,
    district: '宝山区',
    center: L.吴淞,
    radiusKm: 4.2,
    sides: 4,
    altitudeFloor: 0,
    altitudeLimit: 90,
    effectiveFrom: '2024-10-01T00:00:00',
    effectiveTo: '2024-11-30T23:59:59',
    status: AIRSPACE_STATUS.PENDING,
    owner: '宝山区交通委',
    remark: '沿江作业期间临时限飞，10 月 1 日起生效',
  },
  {
    code: 'ASP-05',
    name: '长江口电子围栏',
    category: AIRSPACE_CATEGORY.FENCE,
    level: AIRSPACE_LEVEL.MEDIUM,
    district: '崇明区',
    center: L.长江口,
    radiusKm: 8,
    sides: 5,
    altitudeFloor: 0,
    altitudeLimit: 120,
    effectiveFrom: '2024-06-01T00:00:00',
    effectiveTo: '2024-12-31T23:59:59',
    status: AIRSPACE_STATUS.ACTIVE,
    owner: '上海海事局',
    remark: '越界即触发告警并记录航迹，用于低空入侵监测',
  },
  {
    code: 'ASP-06',
    name: '黄浦江航路走廊',
    category: AIRSPACE_CATEGORY.CORRIDOR,
    level: AIRSPACE_LEVEL.LOW,
    district: '黄浦区',
    center: L.外滩,
    radiusKm: 3,
    sides: 4,
    altitudeFloor: 60,
    altitudeLimit: 150,
    effectiveFrom: '2024-03-01T00:00:00',
    effectiveTo: '2024-12-31T23:59:59',
    status: AIRSPACE_STATUS.ACTIVE,
    owner: '上海市交通管理局',
    remark: '沿江巡查专用走廊，仅允许在 60-150 米高度区间内飞行',
  },
]

export const AIRSPACES = AIRSPACE_PLAN.map((plan, index) => ({
  id: `AIRSPACE-${String(index + 1).padStart(2, '0')}`,
  code: plan.code,
  name: plan.name,
  category: plan.category,
  level: plan.level,
  district: plan.district,
  center: plan.center,
  polygon: buildPolygon(plan),
  radiusKm: plan.radiusKm,
  sides: plan.sides,
  altitudeFloor: plan.altitudeFloor,
  altitudeLimit: plan.altitudeLimit,
  effectiveFrom: plan.effectiveFrom,
  effectiveTo: plan.effectiveTo,
  status: plan.status,
  owner: plan.owner,
  remark: plan.remark,
  color: AIRSPACE_CATEGORY_COLOR[plan.category],
  isCustom: false,
  createdAt: null,
}))

export function airspaceById(id) {
  return AIRSPACES.find((item) => item.id === id) || null
}

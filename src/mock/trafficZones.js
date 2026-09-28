/** 交通航区（空域管制多边形）。 */

import { ZONE_LEVEL } from '../domain/constants'
import { LANDMARKS as L } from './anchors'
import { blobPolygon, createRandom } from './geometry'

const rand = createRandom(20240303)

function round(polygon) {
  return polygon.map(([lng, lat]) => [Number(lng.toFixed(6)), Number(lat.toFixed(6))])
}

const ZONE_PLAN = [
  {
    code: 'ZONE-01',
    name: '浦东核心管控航区',
    level: ZONE_LEVEL.CONTROLLED,
    district: '浦东新区',
    center: L.世纪大道,
    radiusKm: 5.4,
    sides: 3, // 参考图中的三角形管控区
    altitudeLimit: 100,
    color: '#cc4b4b',
    remark: '陆家嘴—世纪大道核心区，飞行需提前 24 小时报批',
  },
  {
    code: 'ZONE-02',
    name: '虹桥机场净空保护区',
    level: ZONE_LEVEL.CONTROLLED,
    district: '闵行区',
    center: [121.3363, 31.1979],
    radiusKm: 7.2,
    sides: 6,
    altitudeLimit: 60,
    color: '#b8801c',
    remark: '机场净空保护区，全时段禁止未报备飞行',
  },
  {
    code: 'ZONE-03',
    name: '长江口报备航区',
    level: ZONE_LEVEL.REPORT,
    district: '崇明区',
    center: L.长江口,
    radiusKm: 9.5,
    sides: 5,
    altitudeLimit: 150,
    color: '#2f6feb',
    remark: '长江口航道监测区，飞行前需报备航线与高度',
  },
]

export const TRAFFIC_ZONES = ZONE_PLAN.map((plan, index) => ({
  id: `ZONE-${String(index + 1).padStart(2, '0')}`,
  code: plan.code,
  name: plan.name,
  level: plan.level,
  district: plan.district,
  center: plan.center,
  polygon: round(blobPolygon(plan.center, plan.radiusKm, plan.sides, rand)),
  altitudeLimit: plan.altitudeLimit,
  color: plan.color,
  remark: plan.remark,
}))

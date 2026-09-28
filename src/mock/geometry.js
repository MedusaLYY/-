/**
 * mock 几何工具（纯函数）。
 * 用途：把「手写的少量真实路口锚点」插值成平滑航线，避免手写几十个坐标点。
 */

import { OBSTACLE_TYPE } from '../domain/constants'

const EARTH_R = 6371 // km
const DEG2RAD = Math.PI / 180

/** 两点球面距离（km），入参为 [lng, lat] */
export function haversine(a, b) {
  const [lng1, lat1] = a
  const [lng2, lat2] = b
  const dLat = (lat2 - lat1) * DEG2RAD
  const dLng = (lng2 - lng1) * DEG2RAD
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG2RAD) * Math.cos(lat2 * DEG2RAD) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_R * Math.asin(Math.sqrt(s))
}

/** 折线总长度（km） */
export function polylineLength(points) {
  let total = 0
  for (let i = 1; i < points.length; i += 1) {
    total += haversine(points[i - 1], points[i])
  }
  return total
}

/**
 * Catmull-Rom 样条插值，把稀疏锚点扩成平滑曲线。
 * @param {Array<[number, number]>} anchors 至少 2 个锚点
 * @param {number} segments 每段插入的采样数（越大越平滑）
 * @returns {Array<[number, number]>}
 */
export function smoothPath(anchors, segments = 8) {
  if (anchors.length < 2) return anchors.slice()
  if (anchors.length === 2) {
    // 两点之间直接线性插值
    const out = []
    for (let i = 0; i <= segments; i += 1) {
      const t = i / segments
      out.push([
        anchors[0][0] + (anchors[1][0] - anchors[0][0]) * t,
        anchors[0][1] + (anchors[1][1] - anchors[0][1]) * t,
      ])
    }
    return out
  }

  // 首尾各补一个虚拟点，让端点也有切线
  const pts = [anchors[0], ...anchors, anchors[anchors.length - 1]]
  const out = []

  for (let i = 0; i < pts.length - 3; i += 1) {
    const p0 = pts[i]
    const p1 = pts[i + 1]
    const p2 = pts[i + 2]
    const p3 = pts[i + 3]

    for (let s = 0; s < segments; s += 1) {
      const t = s / segments
      const t2 = t * t
      const t3 = t2 * t
      out.push([
        0.5 *
          (2 * p1[0] +
            (-p0[0] + p2[0]) * t +
            (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
            (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 *
          (2 * p1[1] +
            (-p0[1] + p2[1]) * t +
            (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
            (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ])
    }
  }

  out.push(anchors[anchors.length - 1])
  return out
}

/**
 * 取折线上按比例 t（0~1）处的点，用于把无人机放在航线上。
 */
export function pointAt(points, t) {
  if (!points.length) return [0, 0]
  const clamped = Math.min(Math.max(t, 0), 1)
  const idx = clamped * (points.length - 1)
  const i = Math.floor(idx)
  const frac = idx - i
  const a = points[i]
  const b = points[Math.min(i + 1, points.length - 1)]
  return [a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac]
}

/**
 * 确定性伪随机（线性同余），保证每次刷新 mock 数据一致，便于走查与截图比对。
 */
export function createRandom(seed = 20240920) {
  let state = seed % 2147483647
  if (state <= 0) state += 2147483646
  return function next() {
    state = (state * 16807) % 2147483647
    return (state - 1) / 2147483646
  }
}

/** 以某点为中心，按给定半径（km）随机散开一点，用于生成不越界的周边点位 */
export function jitter(center, radiusKm, rand) {
  const angle = rand() * Math.PI * 2
  const dist = rand() * radiusKm
  const dLat = (dist / 111) * Math.cos(angle)
  const dLng = (dist / (111 * Math.cos(center[1] * DEG2RAD))) * Math.sin(angle)
  return [center[0] + dLng, center[1] + dLat]
}

/** 以中心点生成矩形多边形（经纬度偏移量按 km 折算），用于任务区域 */
export function rectPolygon(center, widthKm, heightKm) {
  const dLat = heightKm / 2 / 111
  const dLng = widthKm / 2 / (111 * Math.cos(center[1] * DEG2RAD))
  const [lng, lat] = center
  return [
    [lng - dLng, lat - dLat],
    [lng + dLng, lat - dLat],
    [lng + dLng, lat + dLat],
    [lng - dLng, lat + dLat],
  ]
}

/** 以中心点生成不规则多边形（用于交通航区，避免全是矩形显得机械） */
export function blobPolygon(center, radiusKm, sides, rand) {
  const out = []
  for (let i = 0; i < sides; i += 1) {
    const angle = (i / sides) * Math.PI * 2
    const r = radiusKm * (0.72 + rand() * 0.5)
    const dLat = (r / 111) * Math.cos(angle)
    const dLng = (r / (111 * Math.cos(center[1] * DEG2RAD))) * Math.sin(angle)
    out.push([center[0] + dLng, center[1] + dLat])
  }
  return out
}

/**
 * 判断点是否落在多边形内（射线法）。
 * @param {[number, number]} point [lng, lat]
 * @param {Array<[number, number]>} polygon 顶点序列，不闭合（首尾不重复，与业务约定一致）
 */
export function pointInPolygon(point, polygon) {
  if (!polygon || polygon.length < 3) return false
  const [x, y] = point
  let inside = false

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

/**
 * 由锚点序列派生避障绕行段（纯函数、确定性）。
 *
 * 取中段的一个锚点区间，沿其法线方向偏移 clearanceKm 得到两个绕行点，
 * 形成 a → p1 → p2 → b 的绕行折线。锚点少于 3 个时返回空数组。
 *
 * 为什么必须做成共用的纯函数：内置航线（mock/routes.js）与页面新建/编辑的航线
 * （store 的 resolveRouteGeometry）都要派生这个字段，两处走同一套算法才能保证
 * 绕行段形状一致；否则新建航线的绕行段会和内置航线看起来不是一套东西。
 *
 * @param {Array<[number, number]>} anchors
 * @param {number} seed 确定性种子，保证刷新后形状不变
 * @param {number} clearanceKm 绕行偏移距离（km）
 * @returns {Array<{ index: number, reason: string, altitudeDelta: number, points: Array<[number, number]> }>}
 */
export function deriveDetourSegments(anchors, seed = 20240920, clearanceKm = 0.8) {
  if (!Array.isArray(anchors) || anchors.length < 3) return []

  const rand = createRandom(seed + anchors.length * 31)
  const index = Math.max(0, Math.floor(anchors.length / 2) - 1)
  const a = anchors[index]
  const b = anchors[index + 1]
  if (!a || !b) return []

  const dLng = b[0] - a[0]
  const dLat = b[1] - a[1]
  const len = Math.hypot(dLng, dLat) || 1

  // 垂直于 a→b 的法线方向
  const nx = -dLat / len
  const ny = dLng / len

  // 经度方向按纬度做 1/cos 修正，否则高纬度处的东西向偏移会被压扁
  const kx = 1 / Math.max(0.2, Math.cos((a[1] * DEG2RAD)))
  const offset = clearanceKm / 111
  const side = rand() > 0.5 ? 1 : -1

  const p1 = [a[0] + nx * offset * kx * side, a[1] + ny * offset * side]
  const p2 = [b[0] + nx * offset * kx * side, b[1] + ny * offset * side]

  const reasons = Object.values(OBSTACLE_TYPE)

  return [
    {
      index,
      reason: reasons[Math.floor(rand() * reasons.length)],
      altitudeDelta: 20 + Math.round(rand() * 40),
      points: [a, p1, p2, b],
    },
  ]
}

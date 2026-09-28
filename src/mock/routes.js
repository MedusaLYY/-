/**
 * 航线：手写少量真实路口锚点，再用 Catmull-Rom 插值成平滑轨迹。
 * 航线本身不含无人机归属——「谁执行哪条航线」由 tasks.js 统一绑定，避免双向引用。
 */

import { LANDMARKS as L } from './anchors'
import { smoothPath, polylineLength, deriveDetourSegments } from './geometry'
import { AVOID_STRATEGY, RETURN_MODE, ROUTE_COLORS } from '../domain/constants'

/** 20 条航线的锚点定义。anchors 为真实路口序列，按 GCJ-02 书写。 */
const ROUTE_DEFS = [
  { code: 'RT-01', name: '陆家嘴世纪大道巡查线', district: '浦东新区', road: '世纪大道', anchors: [L.陆家嘴, L.世纪大道, L.张杨路, L.杨浦大桥], durationMin: 42 },
  { code: 'RT-02', name: '浦东机场进近监测线', district: '浦东新区', road: '川沙路', anchors: [L.浦东机场, L.祝桥, L.川沙, L.张江], durationMin: 56 },
  { code: 'RT-03', name: '外高桥港区巡航线', district: '浦东新区', road: '洲海路', anchors: [L.张江, L.金桥, L.外高桥, L.高东], durationMin: 48 },
  { code: 'RT-04', name: '前滩周浦交通观测线', district: '浦东新区', road: '沪南公路', anchors: [L.前滩, L.三林, L.周浦, L.康桥], durationMin: 39 },
  { code: 'RT-05', name: '徐汇龙华取证线', district: '徐汇区', road: '龙华中路', anchors: [L.徐家汇, L.龙华中路, L.漕河泾, L.莘庄], durationMin: 44 },
  { code: 'RT-06', name: '沪闵路逆行监测线', district: '闵行区', road: '沪闵路', anchors: [L.沪闵路, L.春申, L.颛桥, L.北桥], durationMin: 37 },
  { code: 'RT-07', name: '虹桥枢纽周边巡查线', district: '闵行区', road: '七莘路', anchors: [L.虹桥机场, L.虹桥枢纽, L.七宝, L.莘庄], durationMin: 33 },
  { code: 'RT-08', name: '南京西路违停监测线', district: '静安区', road: '南京西路', anchors: [L.南京西路, L.静安寺, L.人民广场, L.外滩], durationMin: 28 },
  { code: 'RT-09', name: '延安高架联动巡航线', district: '长宁区', road: '延安西路', anchors: [L.中山公园, L.江苏路, L.静安寺], durationMin: 24 },
  { code: 'RT-10', name: '北外滩五角场巡查线', district: '虹口区', road: '四平路', anchors: [L.北外滩, L.提篮桥, L.平凉路, L.五角场], durationMin: 35 },
  { code: 'RT-11', name: '杨浦滨江巡航线', district: '杨浦区', road: '军工路', anchors: [L.杨浦大桥, L.复兴岛, L.共青森林公园, L.中原], durationMin: 41 },
  { code: 'RT-12', name: '嘉定新城干线巡查线', district: '嘉定区', road: '博乐路', anchors: [L.江桥, L.南翔, L.嘉定新城, L.安亭], durationMin: 52 },
  { code: 'RT-13', name: '嘉定北部低空巡检线', district: '嘉定区', road: '外青松公路', anchors: [L.外冈, L.嘉定新城, L.娄塘, L.华亭], durationMin: 46 },
  { code: 'RT-14', name: '宝山沿江巡查线', district: '宝山区', road: '牡丹江路', anchors: [L.吴淞, L.宝山城区, L.月浦, L.罗店], durationMin: 43 },
  { code: 'RT-15', name: '顾村大场交通观测线', district: '宝山区', road: '沪太路', anchors: [L.大场, L.顾村, L.张庙], durationMin: 31 },
  { code: 'RT-16', name: '崇明东西向巡查线', district: '崇明区', road: '陈海公路', anchors: [L.崇明南门, L.堡镇, L.陈家镇, L.东滩], durationMin: 58 },
  { code: 'RT-17', name: '长江口低空入侵监测线', district: '崇明区', road: '长江口', anchors: [L.长兴岛, L.长江口, L.横沙岛], durationMin: 47 },
  { code: 'RT-18', name: '青浦松江联动巡航线', district: '青浦区', road: '沪青平公路', anchors: [L.青浦新城, L.朱家角, L.练塘, L.松江新城], durationMin: 54 },
  { code: 'RT-19', name: '金山奉贤沿海巡查线', district: '金山区', road: '亭卫公路', anchors: [L.金山新城, L.亭林, L.奉贤新城, L.海湾], durationMin: 61 },
  { code: 'RT-20', name: '松江奉贤南向巡查线', district: '松江区', road: '沪松公路', anchors: [L.松江新城, L.车墩, L.叶榭, L.奉贤新城], durationMin: 45 },
]

function pad(n) {
  return String(n).padStart(2, '0')
}

/* ---------------- 避障与返航 ---------------- */

/** 避障策略轮转表：多数航线启用自动绕行，保留少量其他策略做演示样本 */
const AVOID_STRATEGIES = [
  AVOID_STRATEGY.AUTO_DETOUR,
  AVOID_STRATEGY.AUTO_DETOUR,
  AVOID_STRATEGY.ALT_CLIMB,
  AVOID_STRATEGY.HOVER_WAIT,
  AVOID_STRATEGY.AUTO_DETOUR,
  AVOID_STRATEGY.NONE,
]

const RETURN_MODES = [
  RETURN_MODE.AUTO,
  RETURN_MODE.AUTO,
  RETURN_MODE.LOW_BATTERY,
  RETURN_MODE.AUTO,
  RETURN_MODE.MANUAL,
]

const LANDMARK_ENTRIES = Object.entries(L)

/** 把锚点坐标反查成路口名称——内置航线只存了坐标，没有存名称 */
function landmarkNameOf(coord) {
  const hit = LANDMARK_ENTRIES.find(
    ([, c]) => Math.abs(c[0] - coord[0]) < 1e-6 && Math.abs(c[1] - coord[1]) < 1e-6
  )
  return hit ? hit[0] : '自定义点'
}

export const ROUTES = ROUTE_DEFS.map((def, index) => {
  const path = smoothPath(def.anchors, 9)
  const distanceKm = Number(polylineLength(path).toFixed(1))

  // 返航点：多数航线返回起点，每 4 条留一条返回终点，让演示有差异
  const returnPoint = index % 4 === 3 ? def.anchors[def.anchors.length - 1] : def.anchors[0]
  const altitude = 100 + (index % 4) * 20

  return {
    id: `ROUTE-${pad(index + 1)}`,
    code: def.code,
    name: def.name,
    district: def.district,
    road: def.road,
    color: ROUTE_COLORS[index % ROUTE_COLORS.length],
    anchors: def.anchors,
    path,
    distanceKm,
    durationMin: def.durationMin,
    // ---- 飞行高度与避障返航 ----
    altitude,
    avoidStrategy: AVOID_STRATEGIES[index % AVOID_STRATEGIES.length],
    obstacleClearanceM: 25 + (index % 3) * 5,
    minSafeAltitude: 60,
    maxSafeAltitude: altitude + 60,
    returnPoint,
    returnPointName: landmarkNameOf(returnPoint),
    returnMode: RETURN_MODES[index % RETURN_MODES.length],
    returnBatteryThreshold: 20 + (index % 3) * 5,
    rtlAltitude: altitude + 20,
    // 绕行段是 anchors 的派生值：改锚点必须同步重算。
    // store 的 resolveRouteGeometry 走的是同一个函数，两处口径必须一致
    detourSegments: deriveDetourSegments(def.anchors, 20240920 + index),
  }
})

/** 按 id 取航线 */
export function routeById(id) {
  return ROUTES.find((route) => route.id === id) || null
}

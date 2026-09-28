/**
 * 告警事件 / 任务记录。
 * 每条事件绑定一个正在执行的任务（进而绑定一架无人机与一条航线），
 * 这就是「按事件筛选正在执行该事件的无人机」的数据基础。
 */

import { TASKS } from './tasks'
import { DRONES } from './drones'
import { EVENT_TYPE, EVENT_LEVEL } from '../domain/constants'
import { LANDMARKS as L } from './anchors'

const DATE = '2024-09-20'

const EVENT_PLAN = [
  {
    code: 'EVT-001',
    taskCode: 'TASK-0912',
    type: EVENT_TYPE.CONGESTION,
    level: EVENT_LEVEL.HIGH,
    time: `${DATE}T14:23:18`,
    road: '世纪大道',
    lngLat: L.世纪大道,
    status: 'active',
    description: '世纪大道近浦东南路东向西方向车流排队长度约 620 米，持续 11 分钟，判定为中度拥堵。',
    imageLabel: '异常拥堵',
  },
  {
    code: 'EVT-002',
    taskCode: 'TASK-0918',
    type: EVENT_TYPE.ILLEGAL_PARKING,
    level: EVENT_LEVEL.MEDIUM,
    time: `${DATE}T13:50:07`,
    road: '南京西路',
    lngLat: L.南京西路,
    status: 'processing',
    description: '南京西路近石门一路南侧非机动车道内检测到车辆长时间静止，停留 8 分 30 秒。',
    imageLabel: '疑似违停',
  },
  {
    code: 'EVT-003',
    taskCode: 'TASK-0921',
    type: EVENT_TYPE.WRONG_WAY,
    level: EVENT_LEVEL.HIGH,
    time: `${DATE}T11:17:42`,
    road: '沪闵路',
    lngLat: L.沪闵路,
    status: 'processing',
    description: '沪闵路近莘庄立交检测到车辆逆向行驶，持续 2 个信号周期，已连续抓拍 3 帧。',
    imageLabel: '逆行识别',
  },
  {
    code: 'EVT-004',
    taskCode: 'TASK-0907',
    type: EVENT_TYPE.INTRUSION,
    level: EVENT_LEVEL.HIGH,
    time: `${DATE}T09:42:11`,
    road: '长江口',
    lngLat: L.长江口,
    status: 'active',
    description: '长江口管控航区检测到未报备飞行目标，高度约 145 米，速度 18 m/s，方向东南。',
    imageLabel: '低空入侵',
  },
  {
    code: 'EVT-005',
    taskCode: 'TASK-0903',
    type: EVENT_TYPE.TASK_DONE,
    level: EVENT_LEVEL.LOW,
    time: `${DATE}T08:16:33`,
    road: '龙华中路',
    lngLat: L.龙华中路,
    status: 'closed',
    description: '龙华中路早高峰巡查任务完成，覆盖里程 9.4 公里，采集影像 186 张，未发现异常。',
    imageLabel: '任务完成',
  },
]

export const EVENTS = EVENT_PLAN.map((plan, index) => {
  const task = TASKS.find((item) => item.code === plan.taskCode)
  const drone = DRONES.find((item) => item.id === task.droneId)
  return {
    id: `EVENT-${String(index + 1).padStart(2, '0')}`,
    code: plan.code,
    type: plan.type,
    level: plan.level,
    time: plan.time,
    district: task.district,
    road: plan.road,
    lngLat: plan.lngLat,
    status: plan.status,
    description: plan.description,
    imageLabel: plan.imageLabel,
    // 外键链：event → task → drone / route
    taskId: task.id,
    taskCode: task.code,
    taskName: task.name,
    droneId: drone.id,
    droneName: drone.name,
    routeId: task.routeId,
  }
})

export function eventById(id) {
  return EVENTS.find((event) => event.id === id) || null
}

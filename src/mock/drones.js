/**
 * 无人机档案。
 * taskId / position 为派生字段：由 tasks.js 的绑定关系 + routes.js 的轨迹算出，
 * 不在这里手写，避免与任务表出现不一致。
 */

import { FLEETS } from './fleets'
import { TASKS } from './tasks'
import { routeById } from './routes'
import { pointAt, jitter, createRandom } from './geometry'
import { DRONE_STATUS } from '../domain/constants'

/** 机队 → 无人机编号区间（浦东 8 / 虹桥 7 / 嘉定 7 / 崇明 8 = 30 架） */
const FLEET_ALLOCATION = [
  { fleetId: 'FLT-PD', from: 1, to: 8 },
  { fleetId: 'FLT-HQ', from: 9, to: 15 },
  { fleetId: 'FLT-JD', from: 16, to: 22 },
  { fleetId: 'FLT-CM', from: 23, to: 30 },
]

const MODELS = ['DJI M350 RTK', 'DJI M30T', '纵横 CW-15', 'DJI 机场 2']

const OPERATORS = ['王磊', '李建国', '陈涛', '赵敏', '刘洋', '孙倩', '周航', '吴凡']

/** 非在线状态的两架：一架充电、一架离线（其余 28 架在线，与概览 KPI 对齐） */
const ABNORMAL_STATUS = {
  'SH-UAV-06': DRONE_STATUS.CHARGING,
  'SH-UAV-27': DRONE_STATUS.OFFLINE,
}

const rand = createRandom(20240920)

function pad(n) {
  return String(n).padStart(2, '0')
}

/** 每架无人机当前正在执行的任务（status === executing） */
const EXECUTING_BY_DRONE = new Map(
  TASKS.filter((task) => task.status === 'executing').map((task) => [task.droneId, task])
)

export const DRONES = FLEET_ALLOCATION.flatMap(({ fleetId, from, to }) => {
  const fleet = FLEETS.find((item) => item.id === fleetId)
  const list = []
  for (let no = from; no <= to; no += 1) {
    const id = `SH-UAV-${pad(no)}`
    const task = EXECUTING_BY_DRONE.get(id) || null
    const route = task ? routeById(task.routeId) : null
    const status = ABNORMAL_STATUS[id] || DRONE_STATUS.ONLINE

    // 执行任务的无人机落在其航线上；其余停在机队驻地周边
    const position =
      route && status === DRONE_STATUS.ONLINE
        ? pointAt(route.path, task.progress / 100)
        : jitter(fleet.base, 4.5, rand)

    list.push({
      id,
      name: `无人机${pad(no)}号`,
      fleetId,
      fleetName: fleet.name,
      model: MODELS[no % MODELS.length],
      status,
      battery: status === DRONE_STATUS.CHARGING ? 96 : 34 + Math.round(rand() * 62),
      altitude: task ? 80 + Math.round(rand() * 60) : 0,
      speed: task ? Number((6 + rand() * 6).toFixed(1)) : 0,
      lngLat: [Number(position[0].toFixed(6)), Number(position[1].toFixed(6))],
      taskId: task ? task.id : null,
      taskCode: task ? task.code : null,
      operator: OPERATORS[no % OPERATORS.length],
      lastSeen: task ? '2024-09-20T14:23:00' : '2024-09-20T14:20:00',
      totalFlights: 120 + Math.round(rand() * 380),
      totalHours: Number((40 + rand() * 180).toFixed(1)),
    })
  }
  return list
})

/** 机队规模回填：在册 / 在线 */
export const FLEET_SUMMARY = FLEETS.map((fleet) => {
  const members = DRONES.filter((drone) => drone.fleetId === fleet.id)
  return {
    ...fleet,
    droneCount: members.length,
    onlineCount: members.filter((drone) => drone.status === DRONE_STATUS.ONLINE).length,
    onMissionCount: members.filter((drone) => drone.taskId).length,
  }
})

export function droneById(id) {
  return DRONES.find((drone) => drone.id === id) || null
}

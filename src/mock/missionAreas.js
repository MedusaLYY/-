/** 任务区域：执行中任务对应的作业多边形。 */

import { TASKS } from './tasks'
import { routeById } from './routes'
import { rectPolygon, pointAt, createRandom } from './geometry'
import { ROUTE_COLORS } from '../domain/constants'

const rand = createRandom(20240101)

/** 只有「执行中」且进度未完成的任务才画作业区域 */
const ACTIVE_TASKS = TASKS.filter((task) => task.status === 'executing' && task.progress < 100)

const AREA_SIZE = {
  patrol: [7, 5],
  traffic: [6, 4.5],
  emergency: [9, 7],
  inspection: [6.5, 5],
}

export const MISSION_AREAS = ACTIVE_TASKS.map((task, index) => {
  const route = routeById(task.routeId)
  // 区域中心取航线中段，保证落在作业航段上
  const center = pointAt(route.path, 0.5)
  const [widthKm, heightKm] = AREA_SIZE[task.type] || [6, 5]

  return {
    id: `AREA-${String(index + 1).padStart(2, '0')}`,
    name: `${route.district}作业区`,
    taskId: task.id,
    taskCode: task.code,
    taskName: task.name,
    droneId: task.droneId,
    routeId: route.id,
    district: route.district,
    road: route.road,
    center: [Number(center[0].toFixed(6)), Number(center[1].toFixed(6))],
    polygon: rectPolygon(center, widthKm, heightKm).map(([lng, lat]) => [
      Number(lng.toFixed(6)),
      Number(lat.toFixed(6)),
    ]),
    areaKm2: Number((widthKm * heightKm * 0.92).toFixed(1)),
    altitudeLimit: 120,
    color: ROUTE_COLORS[index % ROUTE_COLORS.length],
    active: true,
  }
})

export function areasByTaskId(taskId) {
  return MISSION_AREAS.filter((area) => area.taskId === taskId)
}

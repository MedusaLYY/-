/**
 * 任务：**无人机 ↔ 航线 的绑定关系唯一来源**。
 * 一条任务绑定一架无人机 + 一条航线；反向的「某架无人机在执行哪条任务」由这里派生。
 */

import { FLEETS } from './fleets'
import { ROUTES } from './routes'
import { APPROVAL_ACTION, APPROVAL_STATUS, TASK_TYPE, TASK_STATUS } from '../domain/constants'

/** 任务计划表：与 ROUTES 一一对应（20 条任务 / 20 条航线） */
const TASK_PLAN = [
  // ---- 执行中（10 条，其中 5 条与告警事件绑定） ----
  { code: 'TASK-0912', name: '世纪大道拥堵态势监测', type: TASK_TYPE.TRAFFIC, status: TASK_STATUS.EXECUTING, droneNo: 7, routeIndex: 0, progress: 68, priority: 'high', startHour: 13, startMin: 40, eventCode: 'EVT-001' },
  { code: 'TASK-0918', name: '南京西路违停取证', type: TASK_TYPE.INSPECTION, status: TASK_STATUS.EXECUTING, droneNo: 10, routeIndex: 7, progress: 52, priority: 'high', startHour: 13, startMin: 10, eventCode: 'EVT-002' },
  { code: 'TASK-0921', name: '沪闵路逆行专项巡查', type: TASK_TYPE.INSPECTION, status: TASK_STATUS.EXECUTING, droneNo: 11, routeIndex: 5, progress: 44, priority: 'normal', startHour: 10, startMin: 35, eventCode: 'EVT-003' },
  { code: 'TASK-0907', name: '长江口低空入侵排查', type: TASK_TYPE.EMERGENCY, status: TASK_STATUS.EXECUTING, droneNo: 25, routeIndex: 16, progress: 81, priority: 'high', startHour: 9, startMin: 0, eventCode: 'EVT-004' },
  { code: 'TASK-0903', name: '龙华中路早高峰巡查', type: TASK_TYPE.PATROL, status: TASK_STATUS.EXECUTING, droneNo: 12, routeIndex: 4, progress: 100, priority: 'normal', startHour: 7, startMin: 30, eventCode: 'EVT-005' },
  { code: 'TASK-0925', name: '北外滩跨江通道巡查', type: TASK_TYPE.PATROL, status: TASK_STATUS.EXECUTING, droneNo: 13, routeIndex: 9, progress: 36, priority: 'normal', startHour: 14, startMin: 5 },
  { code: 'TASK-0927', name: '嘉定新城干线监测', type: TASK_TYPE.TRAFFIC, status: TASK_STATUS.EXECUTING, droneNo: 17, routeIndex: 11, progress: 29, priority: 'normal', startHour: 14, startMin: 20 },
  { code: 'TASK-0929', name: '宝山沿江船舶航道巡查', type: TASK_TYPE.PATROL, status: TASK_STATUS.EXECUTING, droneNo: 20, routeIndex: 13, progress: 73, priority: 'low', startHour: 12, startMin: 50 },
  { code: 'TASK-0931', name: '崇明东西向生态巡查', type: TASK_TYPE.PATROL, status: TASK_STATUS.EXECUTING, droneNo: 23, routeIndex: 15, progress: 57, priority: 'normal', startHour: 11, startMin: 15 },
  { code: 'TASK-0934', name: '金山沿海违法倾倒排查', type: TASK_TYPE.INSPECTION, status: TASK_STATUS.EXECUTING, droneNo: 28, routeIndex: 18, progress: 22, priority: 'high', startHour: 14, startMin: 35 },
  // ---- 待执行（4 条） ----
  { code: 'TASK-0940', name: '浦东机场进近净空巡检', type: TASK_TYPE.PATROL, status: TASK_STATUS.PENDING, droneNo: 2, routeIndex: 1, progress: 0, priority: 'normal', startHour: 16, startMin: 0 },
  { code: 'TASK-0942', name: '延安高架联动巡查', type: TASK_TYPE.PATROL, status: TASK_STATUS.PENDING, droneNo: 14, routeIndex: 8, progress: 0, priority: 'low', startHour: 16, startMin: 30 },
  { code: 'TASK-0944', name: '嘉定北部低空巡检', type: TASK_TYPE.INSPECTION, status: TASK_STATUS.PENDING, droneNo: 18, routeIndex: 12, progress: 0, priority: 'normal', startHour: 17, startMin: 0 },
  { code: 'TASK-0946', name: '松江奉贤南向巡查', type: TASK_TYPE.PATROL, status: TASK_STATUS.PENDING, droneNo: 29, routeIndex: 19, progress: 0, priority: 'low', startHour: 17, startMin: 30 },
  // ---- 已完成（4 条） ----
  { code: 'TASK-0871', name: '外高桥港区夜间巡航线', type: TASK_TYPE.PATROL, status: TASK_STATUS.DONE, droneNo: 3, routeIndex: 2, progress: 100, priority: 'normal', startHour: 6, startMin: 0 },
  { code: 'TASK-0876', name: '虹桥枢纽周边巡查', type: TASK_TYPE.PATROL, status: TASK_STATUS.DONE, droneNo: 15, routeIndex: 6, progress: 100, priority: 'normal', startHour: 7, startMin: 0 },
  { code: 'TASK-0881', name: '杨浦滨江巡航线', type: TASK_TYPE.PATROL, status: TASK_STATUS.DONE, droneNo: 21, routeIndex: 10, progress: 100, priority: 'low', startHour: 8, startMin: 0 },
  { code: 'TASK-0885', name: '青浦松江联动巡查', type: TASK_TYPE.PATROL, status: TASK_STATUS.DONE, droneNo: 24, routeIndex: 17, progress: 100, priority: 'normal', startHour: 9, startMin: 30 },
  // ---- 已中止（2 条） ----
  { code: 'TASK-0890', name: '前滩周浦交通观测', type: TASK_TYPE.TRAFFIC, status: TASK_STATUS.ABORTED, droneNo: 4, routeIndex: 3, progress: 31, priority: 'normal', startHour: 10, startMin: 0, abortReason: '空域临时管制' },
  { code: 'TASK-0894', name: '顾村大场交通观测', type: TASK_TYPE.TRAFFIC, status: TASK_STATUS.ABORTED, droneNo: 19, routeIndex: 14, progress: 12, priority: 'low', startHour: 11, startMin: 0, abortReason: '载荷故障返航' },
]

const DATE = '2024-09-20'

function pad(n) {
  return String(n).padStart(2, '0')
}

function stamp(hour, minute, second = 0) {
  return `${DATE}T${pad(hour)}:${pad(minute)}:${pad(second)}`
}

/** 根据任务类型分配机队：航线落在哪个区，就由该区所在机队执行 */
const FLEET_BY_DISTRICT = {
  浦东新区: 'FLT-PD',
  闵行区: 'FLT-HQ',
  徐汇区: 'FLT-HQ',
  长宁区: 'FLT-HQ',
  静安区: 'FLT-HQ',
  虹口区: 'FLT-PD',
  杨浦区: 'FLT-PD',
  嘉定区: 'FLT-JD',
  宝山区: 'FLT-JD',
  崇明区: 'FLT-CM',
  青浦区: 'FLT-CM',
  松江区: 'FLT-CM',
  金山区: 'FLT-CM',
  奉贤区: 'FLT-CM',
  黄浦区: 'FLT-HQ',
  普陀区: 'FLT-JD',
}

/**
 * 审批状态覆盖表。
 * 默认全部 approved（已执行完 / 在执行的 16 条任务都已经过审批）；
 * 4 条待执行任务刻意覆盖成不同状态，让「草稿 / 待审批 / 已通过 / 已驳回」四态都有样本。
 */
const APPROVAL_PLAN = {
  'TASK-0940': APPROVAL_STATUS.SUBMITTED,
  'TASK-0942': APPROVAL_STATUS.SUBMITTED,
  'TASK-0944': APPROVAL_STATUS.DRAFT,
  'TASK-0946': APPROVAL_STATUS.REJECTED,
}

const REJECT_REASONS = [
  '航线与临时管制空域重叠，需调整后重新提交',
  '同一时段该空域已有其他任务，请错峰执行',
  '计划飞行高度超出该区域限高要求',
]

/** 申请人（取机队负责人）与审批人 */
const APPLICANTS = ['王磊', '陈涛', '赵敏', '李建国']
const APPROVER = '张经理'

function shiftStamp(hour, minute, deltaMin) {
  const total = (((hour * 60 + minute + deltaMin) % 1440) + 1440) % 1440
  return stamp(Math.floor(total / 60), total % 60)
}

export const TASKS = TASK_PLAN.map((plan, index) => {
  const route = ROUTES[plan.routeIndex]
  const droneId = `SH-UAV-${pad(plan.droneNo)}`
  const startAt = stamp(plan.startHour, plan.startMin)
  const totalMin = route.durationMin
  const elapsed = Math.round((plan.progress / 100) * totalMin)
  const endTotal = plan.startHour * 60 + plan.startMin + elapsed
  const endAt = stamp(Math.floor(endTotal / 60) % 24, endTotal % 60)

  // ---- 审批流转记录（按时间正序）----
  const approvalStatus = APPROVAL_PLAN[plan.code] || APPROVAL_STATUS.APPROVED
  const applicant = APPLICANTS[index % APPLICANTS.length]
  const submitAt = shiftStamp(plan.startHour, plan.startMin, -50)
  const decideAt = shiftStamp(plan.startHour, plan.startMin, -20)

  const approvalRecords = []
  if (approvalStatus !== APPROVAL_STATUS.DRAFT) {
    approvalRecords.push({
      id: `APR-${pad(index + 1)}-1`,
      action: APPROVAL_ACTION.SUBMIT,
      operator: applicant,
      role: 'operator',
      at: submitAt,
      comment: `申请执行「${plan.name}」`,
    })
  }
  if (approvalStatus === APPROVAL_STATUS.APPROVED) {
    approvalRecords.push({
      id: `APR-${pad(index + 1)}-2`,
      action: APPROVAL_ACTION.APPROVE,
      operator: APPROVER,
      role: 'approver',
      at: decideAt,
      comment: '同意按计划执行',
    })
  } else if (approvalStatus === APPROVAL_STATUS.REJECTED) {
    approvalRecords.push({
      id: `APR-${pad(index + 1)}-2`,
      action: APPROVAL_ACTION.REJECT,
      operator: APPROVER,
      role: 'approver',
      at: decideAt,
      comment: REJECT_REASONS[index % REJECT_REASONS.length],
    })
  }

  const lastRecord = approvalRecords.length ? approvalRecords[approvalRecords.length - 1] : null

  return {
    id: `TASK-${pad(index + 1)}`,
    code: plan.code,
    name: plan.name,
    type: plan.type,
    status: plan.status,
    fleetId: FLEET_BY_DISTRICT[route.district] || FLEETS[0].id,
    droneId,
    routeId: route.id,
    eventCode: plan.eventCode || null,
    district: route.district,
    road: route.road,
    startAt,
    endAt,
    progress: plan.progress,
    priority: plan.priority,
    abortReason: plan.abortReason || null,
    // ---- 审批（与执行状态正交：审批通过不等于已派发）----
    approvalStatus,
    approvalApplicant: applicant,
    approvalApprover: lastRecord && lastRecord.role === 'approver' ? lastRecord.operator : null,
    approvalAt: lastRecord ? lastRecord.at : null,
    approvalComment: lastRecord ? lastRecord.comment : null,
    approvalRecords,
  }
})

/** 机队规模统计（按 task.fleetId 归属统计在册无人机，由 index.js 补充） */
export function taskByCode(code) {
  return TASKS.find((task) => task.code === code) || null
}

export function taskById(id) {
  return TASKS.find((task) => task.id === id) || null
}

export function tasksByDrone(droneId) {
  return TASKS.filter((task) => task.droneId === droneId)
}

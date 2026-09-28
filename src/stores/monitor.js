/**
 * 监测总览的核心状态。
 *
 * 筛选设计（本项目最关键的逻辑）：
 *   一条管线，收在 filteredTasks 里，其余列表全部由它派生，保证同源。
 *
 *   filteredTasks = tasks
 *     → [事件作用域]  activeEventId ? 仅该事件绑定的任务 : 全部
 *     → [下拉筛选]    taskType / taskStatus / fleetId
 *     → [关键词]      code / name / road / district
 *
 *   两套条件的清空互相独立：
 *     · 事件 chip 上的 × 只清 activeEventId
 *     · 筛选栏的「重置」只清 filters
 */

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  FLEET_SUMMARY,
  DRONES,
  ROUTES,
  TASKS,
  EVENTS,
  TASK_DATA,
  DATA_ASSETS,
  EVIDENCE,
  AI_RESULTS,
  MISSION_AREAS,
  TRAFFIC_ZONES,
  AIRSPACES,
  KPI,
  RANGE_KPI,
  checkDataIntegrity,
  summarizeAiResults,
  smoothPath,
  polylineLength,
  deriveDetourSegments,
  pointInPolygon,
  verifyEvidenceChain,
  delay,
} from '../mock'
import {
  AIRSPACE_CATEGORY_COLOR,
  AIRSPACE_STATUS,
  APPROVAL_ACTION,
  APPROVAL_STATUS,
  MANAGE_TAB,
  TIME_RANGE,
  DRONE_STATUS_LABEL,
  TASK_STATUS,
  ROUTE_COLORS,
  VERIFY_STATUS,
} from '../domain/constants'
import { buildAirspacePolygon } from '../utils/airspace'
import { toFixed } from '../utils/format'

export const useMonitorStore = defineStore('monitor', () => {
  /* ---------------- 实体数据 ---------------- */
  const fleets = ref(FLEET_SUMMARY)
  const drones = ref(DRONES)
  const routes = ref(ROUTES)
  const tasks = ref(TASKS)
  const events = ref(EVENTS)
  const taskData = ref(TASK_DATA)
  const dataAssets = ref(DATA_ASSETS)
  const evidence = ref(EVIDENCE)
  const aiResults = ref(AI_RESULTS)
  const missionAreas = ref(MISSION_AREAS)
  const trafficZones = ref(TRAFFIC_ZONES)
  const airspaces = ref(AIRSPACES)
  const kpi = ref(KPI)

  /* ---------------- 筛选与交互状态 ---------------- */
  const activeEventId = ref(null)
  const filters = ref({ taskType: '', taskStatus: '', fleetId: '', district: '', keyword: '' })
  const scope = ref({ fleetId: '', district: '上海市全域', timeRange: TIME_RANGE.TODAY })
  const layers = ref({
    routes: true,
    drones: true,
    missionAreas: true,
    trafficZones: true,
    airspaces: true,
    realtime: true,
  })
  const selectedTaskId = ref(null)
  const manageTab = ref(MANAGE_TAB.ROUTE)
  /** 地图聚焦请求：nonce 变化即触发一次 fitBounds（用于「查看飞行航线」按钮） */
  const focusRequest = ref({ taskId: null, nonce: 0 })

  /** 取证链校验结果 */
  const evidenceVerify = ref({ status: VERIFY_STATUS.IDLE, at: null, brokenAt: null, total: 0 })

  /* ---------------- 基础查表 ---------------- */
  const droneById = (id) => drones.value.find((item) => item.id === id) || null
  const routeById = (id) => routes.value.find((item) => item.id === id) || null
  const taskById = (id) => tasks.value.find((item) => item.id === id) || null

  /* ---------------- 派生：筛选管线 ---------------- */

  const activeEvent = computed(
    () => events.value.find((item) => item.id === activeEventId.value) || null
  )

  /** 是否处于「有筛选条件」的状态——决定概览卡是否切到作用域口径 */
  const isFiltering = computed(
    () =>
      Boolean(activeEventId.value) ||
      Boolean(
        filters.value.taskType ||
          filters.value.taskStatus ||
          filters.value.fleetId ||
          filters.value.district ||
          filters.value.keyword.trim()
      )
  )

  /** 唯一的筛选管线 */
  const filteredTasks = computed(() => {
    let list = tasks.value

    // 1. 事件作用域
    if (activeEvent.value) {
      list = list.filter((task) => task.id === activeEvent.value.taskId)
    }

    // 2. 下拉筛选
    const f = filters.value
    if (f.taskType) list = list.filter((task) => task.type === f.taskType)
    if (f.taskStatus) list = list.filter((task) => task.status === f.taskStatus)
    if (f.fleetId) list = list.filter((task) => task.fleetId === f.fleetId)
    if (f.district) list = list.filter((task) => task.district === f.district)

    // 3. 关键词
    const keyword = f.keyword.trim().toLowerCase()
    if (keyword) {
      list = list.filter((task) =>
        [task.code, task.name, task.road, task.district].join(' ').toLowerCase().includes(keyword)
      )
    }

    return list
  })

  /**
   * 地图上呈现的任务。
   * 无任何筛选条件时默认只画「执行中」的任务，避免 20 条航线堆满地图。
   */
  const mapTasks = computed(() => {
    if (isFiltering.value) return filteredTasks.value
    return tasks.value.filter((task) => task.status === TASK_STATUS.EXECUTING)
  })

  const mapTaskIds = computed(() => new Set(mapTasks.value.map((task) => task.id)))

  /** 地图上的无人机：只画正在执行任务的 */
  const mapDrones = computed(() =>
    drones.value.filter((drone) => drone.taskId && mapTaskIds.value.has(drone.taskId))
  )

  /**
   * 地图上的航线。
   *
   * 默认只画「有任务在执行」的航线——20 条航线全画上去会糊成一团。
   * 但如果用户从列表里选中了一条不在途的航线，必须把它也画出来，
   * 否则会出现「列表点得动、地图上看不到」的割裂。
   */
  const mapRoutes = computed(() => {
    const bound = routes.value.filter((route) => mapTaskIds.value.has(taskIdOfRoute(route.id)))
    const selectedTask = selectedTaskId.value ? taskById(selectedTaskId.value) : null
    const selectedRoute = selectedTask ? routeById(selectedTask.routeId) : null
    if (selectedRoute && !bound.some((route) => route.id === selectedRoute.id)) {
      return [...bound, selectedRoute]
    }
    return bound
  })

  const mapMissionAreas = computed(() =>
    missionAreas.value.filter((area) => mapTaskIds.value.has(area.taskId))
  )

  const mapTrafficZones = computed(() => trafficZones.value)

  /**
   * 地图上的空域。
   * 与 mapTrafficZones 同口径：全量展示、不随任务筛选变化——
   * 空域是管制规则而不是任务产物，筛任务不该让禁飞区从地图上消失。
   */
  const mapAirspaces = computed(() => airspaces.value)

  /** 空域按类型汇总（空域管理页顶部统计卡用） */
  const airspaceSummary = computed(() => {
    const groups = new Map()
    airspaces.value.forEach((item) => {
      const current = groups.get(item.category) || { category: item.category, count: 0, active: 0 }
      current.count += 1
      if (item.status === AIRSPACE_STATUS.ACTIVE) current.active += 1
      groups.set(item.category, current)
    })
    return [...groups.values()]
  })

  /**
   * 每条空域覆盖了多少架正在执行任务的无人机。
   * 用射线法判断无人机当前位置是否落在空域多边形内。
   */
  const airspaceTaskCoverage = computed(() => {
    const coverage = new Map()
    airspaces.value.forEach((item) => {
      const count = mapDrones.value.filter((drone) =>
        pointInPolygon(drone.lngLat, item.polygon)
      ).length
      coverage.set(item.id, count)
    })
    return coverage
  })

  function taskIdOfRoute(routeId) {
    const task = tasks.value.find((item) => item.routeId === routeId)
    return task ? task.id : null
  }

  /** 事件列表：受下拉筛选与关键词影响，但**不**受 activeEventId 影响（否则无法切换事件） */
  const filteredEvents = computed(() => {
    let list = events.value
    const f = filters.value

    if (f.fleetId) {
      list = list.filter((event) => {
        const drone = droneById(event.droneId)
        return drone && drone.fleetId === f.fleetId
      })
    }
    if (f.taskType) {
      list = list.filter((event) => {
        const task = taskById(event.taskId)
        return task && task.type === f.taskType
      })
    }
    if (f.taskStatus) {
      list = list.filter((event) => {
        const task = taskById(event.taskId)
        return task && task.status === f.taskStatus
      })
    }
    if (f.district) list = list.filter((event) => event.district === f.district)
    const keyword = f.keyword.trim().toLowerCase()
    if (keyword) {
      list = list.filter((event) =>
        [event.code, event.district, event.road, event.taskName]
          .join(' ')
          .toLowerCase()
          .includes(keyword)
      )
    }

    return [...list].sort((a, b) => (a.time < b.time ? 1 : -1))
  })

  /* ---------------- 派生：当前聚焦对象 ---------------- */

  /**
   * 当前聚焦的任务。
   * 优先级：事件绑定的任务 > 用户手动选中的任务 > 筛选结果中的第一个。
   *
   * 判断「选中项是否可用」用的是 filteredTasks（台账口径）而不是 mapTaskIds（地图在途口径）。
   * 列表展示的是全部任务，若这里按在途口径判断，点选待执行 / 已完成 / 已中止的任务
   * 就会被判定为不可用、回退到第一条——表现为「这一行点不动」。
   */
  const focusedTask = computed(() => {
    if (activeEvent.value) return taskById(activeEvent.value.taskId)
    if (
      selectedTaskId.value &&
      filteredTasks.value.some((task) => task.id === selectedTaskId.value)
    ) {
      return taskById(selectedTaskId.value)
    }
    // 没有手动选中时，默认聚焦列表第一行（台账口径），与列表高亮保持一致
    return filteredTasks.value[0] || null
  })

  const focusedDrone = computed(() => (focusedTask.value ? droneById(focusedTask.value.droneId) : null))
  const focusedRoute = computed(() => (focusedTask.value ? routeById(focusedTask.value.routeId) : null))

  /** 事件详情卡展示的事件：事件筛选优先，否则取聚焦任务关联的事件，最后兜底最新一条 */
  const detailEvent = computed(() => {
    if (activeEvent.value) return activeEvent.value
    const task = focusedTask.value
    if (task) {
      const matched = events.value.find((event) => event.taskId === task.id)
      if (matched) return matched
    }
    return filteredEvents.value[0] || events.value[0] || null
  })

  /* ---------------- 派生：作用域内的数据管理内容 ---------------- */

  const focusedTaskData = computed(() =>
    taskData.value.filter((row) => mapTaskIds.value.has(row.taskId))
  )

  const focusedAssets = computed(() =>
    dataAssets.value.filter((row) => mapTaskIds.value.has(row.taskId))
  )

  /**
   * 当前筛选条件下的全部数据资产。
   *
   * 与 focusedAssets 的区别：focusedAssets 跟地图的在途过滤（mapTaskIds），
   * scopedAssets 跟筛选管线（filteredTasks）。
   * 飞行管理卡的数据管理 Tab 用后者，口径才与另外两个 Tab 及独立页面一致。
   */
  const scopedAssets = computed(() => {
    const ids = new Set(filteredTasks.value.map((task) => task.id))
    return dataAssets.value.filter((asset) => ids.has(asset.taskId))
  })

  /** 数据资产按类别汇总（数据管理 Tab 顶部概览） */
  const assetSummary = computed(() => {
    const groups = new Map()
    focusedAssets.value.forEach((asset) => {
      const current = groups.get(asset.category) || {
        key: asset.category,
        label: asset.categoryLabel,
        unit: asset.unit,
        amount: 0,
        sizeMb: 0,
        count: 0,
      }
      current.amount += asset.amount
      current.sizeMb += asset.sizeMb
      current.count += 1
      groups.set(asset.category, current)
    })
    return [...groups.values()].map((item) => ({
      ...item,
      amount: Number(item.amount.toFixed(1)),
      sizeMb: Math.round(item.sizeMb),
    }))
  })

  const focusedEvidence = computed(() => {
    const event = detailEvent.value
    if (!event) return []
    return evidence.value.filter((row) => row.eventId === event.id)
  })

  /** AI 识别结果：优先取事件维度的识别流水，没有则退回最近若干条全局结果 */
  const focusedAiResults = computed(() => {
    const event = detailEvent.value
    if (event) {
      const scoped = aiResults.value.filter((row) => row.eventId === event.id)
      if (scoped.length) {
        return [...scoped].sort((a, b) => (a.detectedAt < b.detectedAt ? 1 : -1))
      }
    }
    return [...aiResults.value].sort((a, b) => (a.detectedAt < b.detectedAt ? 1 : -1)).slice(0, 6)
  })

  const aiSummary = computed(() => summarizeAiResults(focusedAiResults.value))

  /* ---------------- 派生：任务审批 ---------------- */

  /**
   * 审批状态计数。
   * 返回 { key, value } 而不是带中文标签的对象——标签由页面从 APPROVAL_STATUS_LABEL 取，
   * store 不承担展示职责。
   */
  const approvalSummary = computed(() => {
    const order = [
      APPROVAL_STATUS.DRAFT,
      APPROVAL_STATUS.SUBMITTED,
      APPROVAL_STATUS.APPROVED,
      APPROVAL_STATUS.REJECTED,
      APPROVAL_STATUS.WITHDRAWN,
    ]
    return order.map((key) => ({
      key,
      value: tasks.value.filter((task) => task.approvalStatus === key).length,
    }))
  })

  /** 待审批任务，按最近一次审批动作时间升序（等得最久的排前面） */
  const pendingApprovalTasks = computed(() =>
    tasks.value
      .filter((task) => task.approvalStatus === APPROVAL_STATUS.SUBMITTED)
      .sort((a, b) => (a.approvalAt < b.approvalAt ? -1 : 1))
  )

  /** 某条任务的审批记录（已是时间正序） */
  function approvalRecordsOf(taskId) {
    const task = taskById(taskId)
    return task ? task.approvalRecords : []
  }

  /* ---------------- 派生：取证存证链 ---------------- */

  /** 取证链，按区块高度升序 */
  const evidenceChain = computed(() =>
    [...evidence.value].sort((a, b) => a.blockHeight - b.blockHeight)
  )

  /* ---------------- 派生：概览 KPI（全域 / 作用域两种口径） ---------------- */

  const kpiView = computed(() => {
    if (!isFiltering.value) {
      const range = RANGE_KPI[scope.value.timeRange] || RANGE_KPI.today
      return {
        scope: 'global',
        scopeLabel: `上海市全域 · ${range.label}`,
        items: [
          {
            key: 'online',
            label: '在线无人机',
            value: kpi.value.onlineDrones,
            unit: '架',
            delta: `+${kpi.value.deltas.onlineDrones}`,
            deltaTone: 'up',
            trend: kpi.value.trend.onlineDrones,
          },
          {
            key: 'flights',
            label: '飞行架次',
            value: range.flights,
            unit: '架',
            delta: range.deltaFlights,
            deltaTone: 'up',
            trend: kpi.value.trend.todayFlights,
          },
          {
            key: 'hours',
            label: '总航时长',
            value: range.hours,
            unit: '小时',
            delta: range.deltaHours,
            deltaTone: 'up',
          },
          {
            key: 'distance',
            label: '覆盖里程',
            value: range.distanceKm,
            unit: '公里',
            delta: range.deltaDistance,
            deltaTone: 'up',
          },
        ],
      }
    }

    const task = focusedTask.value
    if (!task) {
      return { scope: 'empty', scopeLabel: '当前筛选条件下无匹配任务', items: [] }
    }

    const drone = focusedDrone.value
    const data = taskData.value.find((row) => row.taskId === task.id)
    const hours = data ? data.durationMin / 60 : 0

    return {
      scope: 'task',
      scopeLabel: `${task.code} · ${task.name}`,
      items: [
        {
          key: 'drone',
          label: '关联无人机',
          value: 1,
          unit: '架',
          delta: drone ? DRONE_STATUS_LABEL[drone.status] : '—',
          deltaTone: 'flat',
        },
        {
          key: 'progress',
          label: '任务进度',
          value: task.progress,
          unit: '%',
          delta: `${task.district} · ${task.road}`,
          deltaTone: 'flat',
        },
        {
          key: 'hours',
          label: '本任务航时',
          value: toFixed(hours, 1),
          unit: '小时',
          delta: data ? `${data.durationMin} 分钟` : '—',
          deltaTone: 'flat',
        },
        {
          key: 'distance',
          label: '本任务里程',
          value: data ? data.distanceKm : 0,
          unit: '公里',
          delta: data ? `最大高度 ${data.maxAltitude} 米` : '—',
          deltaTone: 'flat',
        },
      ],
    }
  })

  /* ---------------- 派生：飞行管理三个 Tab 的列表 ---------------- */

  /**
   * 飞行管理卡三个 Tab 的列表。
   *
   * 三个分支**统一按 filteredTasks（当前筛选条件下的全部任务）派生**，不跟随地图的在途过滤。
   * 原因：地图只画在途航线是为了不糊成一团，那是「态势视图」；
   * 而这张列表是「台账视图」，应当显示当前作用域内的全部记录。
   * 口径统一后，Tab 数字才能与独立页面（#/routes、#/tasks、#/data）的表格行数对上。
   */
  const manageRows = computed(() => {
    if (manageTab.value === MANAGE_TAB.ROUTE) {
      return filteredTasks.value
        .map((task) => {
          const route = routeById(task.routeId)
          if (!route) return null
          return {
            ...route,
            taskId: task.id,
            taskCode: task.code,
            droneId: task.droneId,
            taskStatus: task.status,
          }
        })
        .filter(Boolean)
    }

    if (manageTab.value === MANAGE_TAB.TASK) {
      return filteredTasks.value.map((task) => {
        const data = taskData.value.find((row) => row.taskId === task.id)
        return {
          ...task,
          routeName: routeById(task.routeId)?.name || '',
          distanceKm: data ? data.distanceKm : 0,
          durationMin: data ? data.durationMin : 0,
        }
      })
    }

    // 数据管理
    return scopedAssets.value.map((asset) => ({
      ...asset,
      task: taskById(asset.taskId),
    }))
  })

  const activeFilterCount = computed(() => {
    const f = filters.value
    return [f.taskType, f.taskStatus, f.fleetId, f.district, f.keyword.trim()].filter(Boolean).length
  })

  /** 空域范围选项：从任务数据里实际出现的区派生，避免出现没有数据的空选项 */
  const districtOptions = computed(() => {
    const names = [...new Set(tasks.value.map((task) => task.district))]
    return [{ value: '', label: '上海市全域' }, ...names.map((name) => ({ value: name, label: name }))]
  })

  /* ---------------- actions：只改状态，不做计算 ---------------- */

  /** 点击事件：再次点击同一条则取消筛选。选中事件时清空下拉筛选，保证事件一定可见。 */
  function selectEvent(eventId) {
    if (activeEventId.value === eventId) {
      activeEventId.value = null
      return
    }
    activeEventId.value = eventId
    filters.value = { taskType: '', taskStatus: '', fleetId: '', district: '', keyword: '' }
    selectedTaskId.value = null
    manageTab.value = MANAGE_TAB.ROUTE
  }

  function clearEvent() {
    activeEventId.value = null
  }

  function selectTask(taskId) {
    selectedTaskId.value = taskId
  }

  function setFilter(key, value) {
    filters.value = { ...filters.value, [key]: value }
  }

  function resetFilters() {
    filters.value = { taskType: '', taskStatus: '', fleetId: '', district: '', keyword: '' }
    selectedTaskId.value = null
  }

  function setScope(key, value) {
    scope.value = { ...scope.value, [key]: value }
  }

  function toggleLayer(key) {
    layers.value = { ...layers.value, [key]: !layers.value[key] }
  }

  function setManageTab(tab) {
    manageTab.value = tab
  }

  /** 请求地图把视野收到某条任务航线上 */
  function requestFocusRoute(taskId) {
    const target = taskId || focusedTask.value?.id
    if (!target) return
    // 航线图层被关掉的话先打开，否则用户点了按钮看不到东西
    if (!layers.value.routes) layers.value = { ...layers.value, routes: true }
    focusRequest.value = { taskId: target, nonce: focusRequest.value.nonce + 1 }
  }

  /* ---------------- actions：航线规划（新增 / 编辑 / 删除） ---------------- */

  /**
   * 航线自增序号。
   * 从内置航线数量往后排，保证新增航线的 id 不与内置的 ROUTE-01..20 冲突。
   */
  let routeSeq = ROUTES.length

  /**
   * 由锚点序列重算轨迹与里程。
   * path 与 distanceKm 都是锚点的派生值，锚点一变必须同步重算，
   * 否则地图画的还是旧轨迹。
   */
  function resolveRouteGeometry(anchors) {
    const path = smoothPath(anchors, 9)
    return {
      path,
      distanceKm: Number(polylineLength(path).toFixed(1)),
      // 绕行段同样是 anchors 的派生值：改锚点必须同步重算。
      // 这里与 mock/routes.js 调用的是同一个纯函数，两处口径必须一致
      detourSegments: deriveDetourSegments(anchors, 20240920),
    }
  }

  /**
   * 某条航线被哪些任务引用。
   * 被引用时不允许删除，否则任务会指向一条不存在的航线。
   */
  function tasksUsingRoute(routeId) {
    return tasks.value.filter((task) => task.routeId === routeId)
  }

  function addRoute(payload) {
    routeSeq += 1
    const route = {
      id: `ROUTE-${String(routeSeq).padStart(2, '0')}`,
      code: payload.code,
      name: payload.name,
      district: payload.district,
      road: payload.road || '',
      color: ROUTE_COLORS[routeSeq % ROUTE_COLORS.length],
      anchors: payload.anchors,
      ...resolveRouteGeometry(payload.anchors),
      durationMin: payload.durationMin,
      altitude: payload.altitude,
      remark: payload.remark || '',
      isCustom: true,
      createdAt: new Date().toISOString(),
    }
    routes.value = [...routes.value, route]
    return route
  }

  function updateRoute(id, payload) {
    routes.value = routes.value.map((route) => {
      if (route.id !== id) return route
      const anchors = payload.anchors || route.anchors
      return { ...route, ...payload, anchors, ...resolveRouteGeometry(anchors) }
    })
  }

  function removeRoute(id) {
    routes.value = routes.value.filter((route) => route.id !== id)
  }

  /* ---------------- actions：空域管理 ---------------- */

  let airspaceSeq = AIRSPACES.length

  /**
   * 按类型重算多边形。
   * 与空域管理页的表单预览共用 utils/airspace.js 的同一个函数，
   * 保证预览形状与保存后的形状一致。
   */
  function resolveAirspaceGeometry(center, radiusKm, sides, category) {
    return { polygon: buildAirspacePolygon(center, radiusKm, sides, category) }
  }

  function nextAirspaceCode() {
    const used = new Set(airspaces.value.map((item) => item.code))
    let n = 1
    while (used.has(`ASP-N${String(n).padStart(2, '0')}`)) n += 1
    return `ASP-N${String(n).padStart(2, '0')}`
  }

  function addAirspace(payload) {
    airspaceSeq += 1
    const item = {
      id: `AIRSPACE-${String(airspaceSeq).padStart(2, '0')}`,
      code: payload.code || nextAirspaceCode(),
      name: payload.name,
      category: payload.category,
      level: payload.level,
      district: payload.district,
      center: payload.center,
      ...resolveAirspaceGeometry(payload.center, payload.radiusKm, payload.sides, payload.category),
      radiusKm: payload.radiusKm,
      sides: payload.sides,
      altitudeFloor: payload.altitudeFloor,
      altitudeLimit: payload.altitudeLimit,
      effectiveFrom: payload.effectiveFrom,
      effectiveTo: payload.effectiveTo,
      status: payload.status,
      owner: payload.owner,
      remark: payload.remark || '',
      color: AIRSPACE_CATEGORY_COLOR[payload.category],
      isCustom: true,
      createdAt: new Date().toISOString(),
    }
    airspaces.value = [...airspaces.value, item]
    return item
  }

  function updateAirspace(id, payload) {
    airspaces.value = airspaces.value.map((item) => {
      if (item.id !== id) return item

      // 中心点 / 半径 / 边数 / 类型任一变化都要重算多边形
      const center = payload.center || item.center
      const radiusKm = payload.radiusKm || item.radiusKm
      const sides = payload.sides || item.sides
      const category = payload.category || item.category

      return {
        ...item,
        ...payload,
        center,
        radiusKm,
        sides,
        category,
        ...resolveAirspaceGeometry(center, radiusKm, sides, category),
        color: AIRSPACE_CATEGORY_COLOR[category],
      }
    })
  }

  function removeAirspace(id) {
    airspaces.value = airspaces.value.filter((item) => item.id !== id)
  }

  /* ---------------- actions：任务审批流转 ---------------- */

  const APPROVER_NAME = '张经理'

  /**
   * 追加一条审批记录并同步任务上的摘要字段。
   *
   * 注意：审批状态与执行状态**正交**——审批通过不会把 pending 改成 executing。
   * 「准飞许可」和「调度状态」是两回事，一旦联动会让 KPI、地图与 busy 约束全都跟着变。
   */
  function appendApproval(taskId, action, comment) {
    tasks.value = tasks.value.map((task) => {
      if (task.id !== taskId) return task

      const isApprover = action === APPROVAL_ACTION.APPROVE || action === APPROVAL_ACTION.REJECT
      const record = {
        id: `APR-${task.id.replace('TASK-', '')}-${task.approvalRecords.length + 1}`,
        action,
        operator: isApprover ? APPROVER_NAME : task.approvalApplicant,
        role: isApprover ? 'approver' : 'operator',
        at: new Date().toISOString(),
        comment: comment || '',
      }

      const nextStatus = {
        [APPROVAL_ACTION.SUBMIT]: APPROVAL_STATUS.SUBMITTED,
        [APPROVAL_ACTION.APPROVE]: APPROVAL_STATUS.APPROVED,
        [APPROVAL_ACTION.REJECT]: APPROVAL_STATUS.REJECTED,
        [APPROVAL_ACTION.WITHDRAW]: APPROVAL_STATUS.WITHDRAWN,
      }[action]

      return {
        ...task,
        approvalStatus: nextStatus,
        approvalApprover: isApprover ? APPROVER_NAME : task.approvalApprover,
        approvalAt: record.at,
        approvalComment: comment || '',
        approvalRecords: [...task.approvalRecords, record],
      }
    })
  }

  function submitApproval(taskId, comment) {
    appendApproval(taskId, APPROVAL_ACTION.SUBMIT, comment)
  }

  function approveTask(taskId, comment) {
    appendApproval(taskId, APPROVAL_ACTION.APPROVE, comment)
  }

  function rejectTask(taskId, comment) {
    appendApproval(taskId, APPROVAL_ACTION.REJECT, comment)
  }

  function withdrawApproval(taskId, comment) {
    appendApproval(taskId, APPROVAL_ACTION.WITHDRAW, comment)
  }

  /* ---------------- actions：取证链校验 ---------------- */

  async function verifyEvidence() {
    evidenceVerify.value = { status: VERIFY_STATUS.RUNNING, at: null, brokenAt: null, total: 0 }
    await delay(600)

    const result = verifyEvidenceChain(evidence.value)
    evidence.value = evidence.value.map((row) => ({
      ...row,
      verified: result.valid,
      verifiedAt: result.checkedAt,
    }))
    evidenceVerify.value = {
      status: result.valid ? VERIFY_STATUS.PASS : VERIFY_STATUS.FAIL,
      at: result.checkedAt,
      brokenAt: result.brokenAt,
      total: result.total,
    }
  }

  function resetEvidenceVerify() {
    evidenceVerify.value = { status: VERIFY_STATUS.IDLE, at: null, brokenAt: null, total: 0 }
  }

  function bootstrap() {
    checkDataIntegrity()
  }

  return {
    // 实体
    fleets,
    drones,
    routes,
    tasks,
    events,
    taskData,
    dataAssets,
    evidence,
    aiResults,
    missionAreas,
    trafficZones,
    airspaces,
    kpi,
    // 状态
    activeEventId,
    filters,
    scope,
    layers,
    selectedTaskId,
    manageTab,
    focusRequest,
    evidenceVerify,
    // 派生
    activeEvent,
    isFiltering,
    filteredTasks,
    mapTasks,
    mapDrones,
    mapRoutes,
    mapMissionAreas,
    mapTrafficZones,
    mapAirspaces,
    airspaceSummary,
    airspaceTaskCoverage,
    filteredEvents,
    focusedTask,
    focusedDrone,
    focusedRoute,
    detailEvent,
    focusedTaskData,
    focusedAssets,
    scopedAssets,
    assetSummary,
    focusedEvidence,
    focusedAiResults,
    aiSummary,
    approvalSummary,
    pendingApprovalTasks,
    approvalRecordsOf,
    evidenceChain,
    kpiView,
    manageRows,
    activeFilterCount,
    districtOptions,
    // 工具
    droneById,
    routeById,
    taskById,
    // actions
    selectEvent,
    clearEvent,
    selectTask,
    setFilter,
    resetFilters,
    setScope,
    toggleLayer,
    setManageTab,
    requestFocusRoute,
    bootstrap,
    // 航线规划
    tasksUsingRoute,
    addRoute,
    updateRoute,
    removeRoute,
    // 空域管理
    addAirspace,
    updateAirspace,
    removeAirspace,
    // 任务审批
    submitApproval,
    approveTask,
    rejectTask,
    withdrawApproval,
    // 取证链
    verifyEvidence,
    resetEvidenceVerify,
  }
})

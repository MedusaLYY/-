/** 应用级状态：顶栏用户、通知、当前导航。 */

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { ACCESS_LEVEL_RANK, ROLE, ROLE_LABEL, ROLE_PERMISSION } from '../domain/constants'

export const useAppStore = defineStore('app', () => {
  const user = ref({ name: '张经理', org: '上海市交通管理局' })

  /**
   * 当前登录角色。
   *
   * 默认取「监管主管」而不是「业务操作员」：这是演示系统，默认角色要能展示
   * 审批、空域管理、导出、取证校验这些能力；想看权限收窄的效果，切到「只读访客」即可。
   *
   * 权限只作用于两件事：**数据资产的可见性**与**写操作的显隐**。
   * 绝不进入 monitor store 的筛选管线 —— 否则同一个任务会在监测总览可见、
   * 在数据管理页不可见，而且会让 manageRows 的 Tab 计数与独立页表格行数对不上。
   */
  const currentRole = ref(ROLE.SUPERVISOR)

  const roleLabel = computed(() => ROLE_LABEL[currentRole.value])

  const permissions = computed(
    () => ROLE_PERMISSION[currentRole.value] || ROLE_PERMISSION[ROLE.OPERATOR]
  )

  /** 当前角色可访问的最高数据密级（字符串，用于展示） */
  const maxAccessLevel = computed(() => permissions.value.maxAccessLevel)

  /**
   * 最高可见密级的**等级值**（数字，用于比较）。
   *
   * 不要拿 maxAccessLevel 直接比大小——它是字符串，
   * `1 <= 'restricted'` 会因为 NaN 恒为 false，把所有数据都过滤掉。
   */
  const maxAccessRank = computed(() => ACCESS_LEVEL_RANK[permissions.value.maxAccessLevel] ?? 0)

  function setRole(key) {
    if (ROLE_PERMISSION[key]) currentRole.value = key
  }

  /** 统一的权限判定入口。页面里一律用它，不要直接读 ROLE_PERMISSION */
  function can(action) {
    return Boolean(permissions.value[action])
  }

  const notifications = ref([
    { id: 1, title: '长江口管控航区检测到未报备飞行目标', time: '09:42', level: 'danger', read: false },
    { id: 2, title: '浦东核心管控航区明日 08:00-12:00 临时管制', time: '08:15', level: 'warn', read: false },
    { id: 3, title: '崇明机队无人机 27 号离线超过 30 分钟', time: '07:58', level: 'warn', read: true },
    { id: 4, title: '今日飞行计划已全部下发完成', time: '06:30', level: 'info', read: true },
  ])

  const unreadCount = computed(() => notifications.value.filter((item) => !item.read).length)

  const navItems = [
    { key: 'monitor', label: '监测总览', to: '/monitor' },
    { key: 'airspace', label: '空域管理', to: '/airspace' },
    { key: 'routes', label: '航线规划', to: '/routes' },
    { key: 'tasks', label: '任务执行', to: '/tasks' },
    { key: 'data', label: '数据管理', to: '/data' },
    { key: 'evidence', label: '取证存证', to: '/evidence' },
    { key: 'stat', label: '统计分析', to: '/stat' },
  ]

  function markAllRead() {
    notifications.value = notifications.value.map((item) => ({ ...item, read: true }))
  }

  return {
    user,
    notifications,
    unreadCount,
    navItems,
    markAllRead,
    currentRole,
    roleLabel,
    permissions,
    maxAccessLevel,
    maxAccessRank,
    setRole,
    can,
  }
})

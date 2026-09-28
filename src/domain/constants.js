/**
 * 领域常量：枚举、标签映射、配色。
 * 约定：所有枚举值用英文常量，展示文案统一从 *_LABEL 里取，避免文案散落在组件中。
 */

/* ---------------- 坐标系 ---------------- */

/**
 * 本地 GeoJSON（src/assets/geo/shanghai.json）的源坐标系。
 * 高德栅格瓦片为 GCJ-02；DataV 的行政区划数据来源于高德行政区划服务，同样为 GCJ-02。
 * 若实测发现区界与底图存在约 500m 量级整体偏移，把这里改为 'wgs84'，
 * 加载时会自动经 utils/geo.js 转换为 GCJ-02 后再叠加。
 */
export const GEO_SOURCE_CRS = 'gcj02'

/* ---------------- 上海视野 ---------------- */

export const SHANGHAI_VIEW = {
  center: [31.24, 121.47],
  // 9.5 是能让「崇明岛 → 金山/奉贤」整个市域同时入画的最大缩放级别
  zoom: 9.5,
  minZoom: 9,
  maxZoom: 16,
  bounds: [
    [30.6, 120.8],
    [31.95, 122.2],
  ],
}

/* ---------------- 事件类型 ---------------- */

export const EVENT_TYPE = {
  CONGESTION: 'congestion',
  ILLEGAL_PARKING: 'illegal_parking',
  WRONG_WAY: 'wrong_way',
  INTRUSION: 'intrusion',
  TASK_DONE: 'task_done',
}

export const EVENT_TYPE_LABEL = {
  [EVENT_TYPE.CONGESTION]: '异常拥堵',
  [EVENT_TYPE.ILLEGAL_PARKING]: '疑似违停',
  [EVENT_TYPE.WRONG_WAY]: '逆行识别',
  [EVENT_TYPE.INTRUSION]: '低空入侵',
  [EVENT_TYPE.TASK_DONE]: '任务完成',
}

/** 事件列表左侧圆点配色 */
export const EVENT_TYPE_COLOR = {
  [EVENT_TYPE.CONGESTION]: 'var(--danger)',
  [EVENT_TYPE.ILLEGAL_PARKING]: 'var(--warn)',
  [EVENT_TYPE.WRONG_WAY]: 'var(--accent)',
  [EVENT_TYPE.INTRUSION]: 'var(--route-5)',
  [EVENT_TYPE.TASK_DONE]: 'var(--success)',
}

export const EVENT_LEVEL = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
}

export const EVENT_LEVEL_LABEL = {
  [EVENT_LEVEL.HIGH]: '高',
  [EVENT_LEVEL.MEDIUM]: '中',
  [EVENT_LEVEL.LOW]: '低',
}

export const EVENT_LEVEL_TAG = {
  [EVENT_LEVEL.HIGH]: 'tag-danger',
  [EVENT_LEVEL.MEDIUM]: 'tag-warn',
  [EVENT_LEVEL.LOW]: 'tag-neutral',
}

/* ---------------- 任务 ---------------- */

export const TASK_TYPE = {
  PATROL: 'patrol',
  TRAFFIC: 'traffic',
  EMERGENCY: 'emergency',
  INSPECTION: 'inspection',
}

export const TASK_TYPE_LABEL = {
  [TASK_TYPE.PATROL]: '日常巡查',
  [TASK_TYPE.TRAFFIC]: '交通监测',
  [TASK_TYPE.EMERGENCY]: '应急处置',
  [TASK_TYPE.INSPECTION]: '专项检查',
}

export const TASK_STATUS = {
  EXECUTING: 'executing',
  PENDING: 'pending',
  DONE: 'done',
  ABORTED: 'aborted',
}

export const TASK_STATUS_LABEL = {
  [TASK_STATUS.EXECUTING]: '执行中',
  [TASK_STATUS.PENDING]: '待执行',
  [TASK_STATUS.DONE]: '已完成',
  [TASK_STATUS.ABORTED]: '已中止',
}

export const TASK_STATUS_TAG = {
  [TASK_STATUS.EXECUTING]: 'tag-info',
  [TASK_STATUS.PENDING]: 'tag-neutral',
  [TASK_STATUS.DONE]: 'tag-success',
  [TASK_STATUS.ABORTED]: 'tag-danger',
}

export const PRIORITY_LABEL = {
  high: '高',
  normal: '中',
  low: '低',
}

/* ---------------- 无人机 ---------------- */

export const DRONE_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  CHARGING: 'charging',
}

export const DRONE_STATUS_LABEL = {
  [DRONE_STATUS.ONLINE]: '在线',
  [DRONE_STATUS.OFFLINE]: '离线',
  [DRONE_STATUS.CHARGING]: '充电中',
}

export const DRONE_STATUS_TAG = {
  [DRONE_STATUS.ONLINE]: 'tag-success',
  [DRONE_STATUS.OFFLINE]: 'tag-neutral',
  [DRONE_STATUS.CHARGING]: 'tag-warn',
}

/* ---------------- 交通航区 ---------------- */

export const ZONE_LEVEL = {
  CONTROLLED: 'controlled',
  REPORT: 'report',
  FREE: 'free',
}

export const ZONE_LEVEL_LABEL = {
  [ZONE_LEVEL.CONTROLLED]: '管控航区',
  [ZONE_LEVEL.REPORT]: '报备航区',
  [ZONE_LEVEL.FREE]: '自由航区',
}

/* ---------------- AI 识别分类 ---------------- */

export const AI_CATEGORY = {
  TRAFFIC_STATE: 'traffic_state',
  ABNORMAL_EVENT: 'abnormal_event',
  VIOLATION: 'violation',
}

export const AI_CATEGORY_LABEL = {
  [AI_CATEGORY.TRAFFIC_STATE]: '交通状态识别',
  [AI_CATEGORY.ABNORMAL_EVENT]: '异常事件检测',
  [AI_CATEGORY.VIOLATION]: '交通违法取证',
}

/* ---------------- 拥堵等级 ---------------- */

export const CONGESTION_LEVEL = {
  SMOOTH: 'smooth',
  LIGHT: 'light',
  MEDIUM: 'medium',
  HEAVY: 'heavy',
}

export const CONGESTION_LEVEL_LABEL = {
  [CONGESTION_LEVEL.SMOOTH]: '畅通',
  [CONGESTION_LEVEL.LIGHT]: '轻度拥堵',
  [CONGESTION_LEVEL.MEDIUM]: '中度拥堵',
  [CONGESTION_LEVEL.HEAVY]: '严重拥堵',
}

export const CONGESTION_LEVEL_COLOR = {
  [CONGESTION_LEVEL.SMOOTH]: 'var(--success)',
  [CONGESTION_LEVEL.LIGHT]: '#7ba428',
  [CONGESTION_LEVEL.MEDIUM]: 'var(--warn)',
  [CONGESTION_LEVEL.HEAVY]: 'var(--danger)',
}

/* ---------------- 取证状态 ---------------- */

export const EVIDENCE_STATUS = {
  CAPTURED: 'captured',
  PENDING: 'pending',
}

export const EVIDENCE_STATUS_LABEL = {
  [EVIDENCE_STATUS.CAPTURED]: '已取证',
  [EVIDENCE_STATUS.PENDING]: '待审核',
}

/* ---------------- 航线分类色 ---------------- */

export const ROUTE_COLORS = ['#2f6feb', '#1f9c9c', '#b8801c', '#cc4b4b', '#7a5bd0', '#2e8a5a']

/**
 * 航线规划时按巡航速度估算时长（km/h）。
 * 取现有航线「里程 ÷ 时长」的中间水平，让新航线算出来的时长量级与内置航线一致。
 */
export const ROUTE_CRUISE_SPEED_KMH = 18

/** 航线默认飞行高度（米），新建表单的初始值 */
export const ROUTE_DEFAULT_ALTITUDE = 120

/** 途经点上限（含起终点共 5 个锚点，再多插值出来的曲线会明显失真） */
export const ROUTE_MAX_WAYPOINTS = 3

/* ---------------- 地图底图 ---------------- */

/**
 * 高德栅格瓦片（GCJ-02）。免 key，实测可直连。
 * 监测总览地图与航线规划页的预览地图共用这一份配置，避免两处各写一遍。
 */
export const AMAP_TILE_URL =
  'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}'

/* ---------------- 地图图层 ---------------- */

/**
 * 地图图层清单。
 * MapLegend 由它派生渲染，新增一类业务图层只需在这里加一条 + 在 store 里加对应的 mapXxx computed。
 * kind 决定图例左侧的图形样式（对应 MapLegend 的 .mark-* 类）。
 * 注意：底部的「实时任务」开关（layers.realtime）不属于业务图层，不列在这里。
 */
export const MAP_LAYERS = [
  { key: 'drones', label: '无人机位置', kind: 'drone' },
  { key: 'routes', label: '航线轨迹', kind: 'route' },
  { key: 'missionAreas', label: '任务区域', kind: 'area' },
  { key: 'trafficZones', label: '交通航区', kind: 'zone' },
  { key: 'airspaces', label: '空域围栏', kind: 'airspace' },
]

/* ---------------- 时间范围 ---------------- */

export const TIME_RANGE = {
  TODAY: 'today',
  WEEK: '7d',
  MONTH: '30d',
}

/** 下拉里用短标签（列宽有限），完整时间范围展示在概览卡的作用域徽标上 */
export const TIME_RANGE_OPTIONS = [
  { value: TIME_RANGE.TODAY, label: '今日' },
  { value: TIME_RANGE.WEEK, label: '近 7 天' },
  { value: TIME_RANGE.MONTH, label: '近 30 天' },
]

/* ---------------- 飞行管理 Tab ---------------- */

export const MANAGE_TAB = {
  ROUTE: 'route',
  TASK: 'task',
  DATA: 'data',
}

export const MANAGE_TABS = [
  { key: MANAGE_TAB.ROUTE, label: '航线规划' },
  { key: MANAGE_TAB.TASK, label: '任务执行' },
  { key: MANAGE_TAB.DATA, label: '数据管理' },
]

/* ================================================================
   空域管理
   ================================================================ */

export const AIRSPACE_CATEGORY = {
  NO_FLY: 'no_fly',
  RESTRICTED: 'restricted',
  FENCE: 'fence',
  CORRIDOR: 'corridor',
}

export const AIRSPACE_CATEGORY_LABEL = {
  [AIRSPACE_CATEGORY.NO_FLY]: '禁飞区',
  [AIRSPACE_CATEGORY.RESTRICTED]: '限飞区',
  [AIRSPACE_CATEGORY.FENCE]: '电子围栏',
  [AIRSPACE_CATEGORY.CORRIDOR]: '航路走廊',
}

/**
 * 地图多边形配色。
 * 必须是 hex —— Leaflet 的 SVG 渲染器不解析 CSS 变量，写 var(--danger) 会变成黑色。
 */
export const AIRSPACE_CATEGORY_COLOR = {
  [AIRSPACE_CATEGORY.NO_FLY]: '#cc4b4b',
  [AIRSPACE_CATEGORY.RESTRICTED]: '#b8801c',
  [AIRSPACE_CATEGORY.FENCE]: '#7a5bd0',
  [AIRSPACE_CATEGORY.CORRIDOR]: '#2f6feb',
}

/** 线型：禁飞区实线、限飞区虚线、围栏点线、走廊长虚线。null 表示实线 */
export const AIRSPACE_CATEGORY_DASH = {
  [AIRSPACE_CATEGORY.NO_FLY]: null,
  [AIRSPACE_CATEGORY.RESTRICTED]: '6 4',
  [AIRSPACE_CATEGORY.FENCE]: '2 4',
  [AIRSPACE_CATEGORY.CORRIDOR]: '12 5',
}

export const AIRSPACE_LEVEL = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
}

export const AIRSPACE_LEVEL_LABEL = {
  [AIRSPACE_LEVEL.HIGH]: '一级管控',
  [AIRSPACE_LEVEL.MEDIUM]: '二级管控',
  [AIRSPACE_LEVEL.LOW]: '三级管控',
}

export const AIRSPACE_LEVEL_TAG = {
  [AIRSPACE_LEVEL.HIGH]: 'tag-danger',
  [AIRSPACE_LEVEL.MEDIUM]: 'tag-warn',
  [AIRSPACE_LEVEL.LOW]: 'tag-info',
}

export const AIRSPACE_STATUS = {
  ACTIVE: 'active',
  PENDING: 'pending',
  EXPIRED: 'expired',
  DISABLED: 'disabled',
}

export const AIRSPACE_STATUS_LABEL = {
  [AIRSPACE_STATUS.ACTIVE]: '生效中',
  [AIRSPACE_STATUS.PENDING]: '待生效',
  [AIRSPACE_STATUS.EXPIRED]: '已失效',
  [AIRSPACE_STATUS.DISABLED]: '已停用',
}

export const AIRSPACE_STATUS_TAG = {
  [AIRSPACE_STATUS.ACTIVE]: 'tag-success',
  [AIRSPACE_STATUS.PENDING]: 'tag-warn',
  [AIRSPACE_STATUS.EXPIRED]: 'tag-neutral',
  [AIRSPACE_STATUS.DISABLED]: 'tag-neutral',
}

/** 空域表单默认值 */
export const AIRSPACE_DEFAULT_RADIUS_KM = 3
export const AIRSPACE_DEFAULT_SIDES = 6

/* ================================================================
   任务审批
   ================================================================ */

export const APPROVAL_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
}

export const APPROVAL_STATUS_LABEL = {
  [APPROVAL_STATUS.DRAFT]: '草稿',
  [APPROVAL_STATUS.SUBMITTED]: '待审批',
  [APPROVAL_STATUS.APPROVED]: '已通过',
  [APPROVAL_STATUS.REJECTED]: '已驳回',
  [APPROVAL_STATUS.WITHDRAWN]: '已撤回',
}

export const APPROVAL_STATUS_TAG = {
  [APPROVAL_STATUS.DRAFT]: 'tag-neutral',
  [APPROVAL_STATUS.SUBMITTED]: 'tag-warn',
  [APPROVAL_STATUS.APPROVED]: 'tag-success',
  [APPROVAL_STATUS.REJECTED]: 'tag-danger',
  [APPROVAL_STATUS.WITHDRAWN]: 'tag-neutral',
}

export const APPROVAL_ACTION = {
  SUBMIT: 'submit',
  APPROVE: 'approve',
  REJECT: 'reject',
  WITHDRAW: 'withdraw',
}

export const APPROVAL_ACTION_LABEL = {
  [APPROVAL_ACTION.SUBMIT]: '提交审批',
  [APPROVAL_ACTION.APPROVE]: '审批通过',
  [APPROVAL_ACTION.REJECT]: '审批驳回',
  [APPROVAL_ACTION.WITHDRAW]: '撤回申请',
}

/** 审批记录圆点配色 */
export const APPROVAL_ACTION_COLOR = {
  [APPROVAL_ACTION.SUBMIT]: 'var(--accent)',
  [APPROVAL_ACTION.APPROVE]: 'var(--success)',
  [APPROVAL_ACTION.REJECT]: 'var(--danger)',
  [APPROVAL_ACTION.WITHDRAW]: 'var(--text-muted)',
}

/** 哪些审批状态允许「提交」 */
export const APPROVAL_SUBMITTABLE = [
  APPROVAL_STATUS.DRAFT,
  APPROVAL_STATUS.REJECTED,
  APPROVAL_STATUS.WITHDRAWN,
]

/* ================================================================
   避障与返航
   ================================================================ */

export const AVOID_STRATEGY = {
  NONE: 'none',
  AUTO_DETOUR: 'auto_detour',
  HOVER_WAIT: 'hover_wait',
  ALT_CLIMB: 'alt_climb',
}

export const AVOID_STRATEGY_LABEL = {
  [AVOID_STRATEGY.NONE]: '不启用',
  [AVOID_STRATEGY.AUTO_DETOUR]: '自动绕行',
  [AVOID_STRATEGY.HOVER_WAIT]: '悬停等待',
  [AVOID_STRATEGY.ALT_CLIMB]: '抬升越障',
}

export const RETURN_MODE = {
  AUTO: 'auto',
  MANUAL: 'manual',
  LOW_BATTERY: 'low_battery',
}

export const RETURN_MODE_LABEL = {
  [RETURN_MODE.AUTO]: '自动返航',
  [RETURN_MODE.MANUAL]: '手动触发返航',
  [RETURN_MODE.LOW_BATTERY]: '低电量返航',
}

export const OBSTACLE_TYPE = {
  BUILDINGS: 'buildings',
  TOWER: 'tower',
  BRIDGE: 'bridge',
  RESTRICTED: 'restricted',
  NO_FLY: 'no_fly',
}

export const OBSTACLE_TYPE_LABEL = {
  [OBSTACLE_TYPE.BUILDINGS]: '高层建筑',
  [OBSTACLE_TYPE.TOWER]: '通信塔',
  [OBSTACLE_TYPE.BRIDGE]: '跨江桥梁',
  [OBSTACLE_TYPE.RESTRICTED]: '限飞区',
  [OBSTACLE_TYPE.NO_FLY]: '禁飞区',
}

/** 绕行段在地图上的颜色（hex，Leaflet 用） */
export const DETOUR_COLOR = '#e07b39'

/* ================================================================
   数据回传与存储
   ================================================================ */

export const TRANSMISSION_STATUS = {
  SYNCED: 'synced',
  UPLOADING: 'uploading',
  QUEUED: 'queued',
  FAILED: 'failed',
}

export const TRANSMISSION_STATUS_LABEL = {
  [TRANSMISSION_STATUS.SYNCED]: '已回传',
  [TRANSMISSION_STATUS.UPLOADING]: '回传中',
  [TRANSMISSION_STATUS.QUEUED]: '排队中',
  [TRANSMISSION_STATUS.FAILED]: '回传失败',
}

export const TRANSMISSION_STATUS_TAG = {
  [TRANSMISSION_STATUS.SYNCED]: 'tag-success',
  [TRANSMISSION_STATUS.UPLOADING]: 'tag-info',
  [TRANSMISSION_STATUS.QUEUED]: 'tag-warn',
  [TRANSMISSION_STATUS.FAILED]: 'tag-danger',
}

export const LINK_QUALITY = {
  STRONG: 'strong',
  MEDIUM: 'medium',
  WEAK: 'weak',
}

export const LINK_QUALITY_LABEL = {
  [LINK_QUALITY.STRONG]: '链路良好',
  [LINK_QUALITY.MEDIUM]: '链路一般',
  [LINK_QUALITY.WEAK]: '链路较弱',
}

export const STORAGE_TIER = {
  HOT: 'hot',
  WARM: 'warm',
  COLD: 'cold',
  EVIDENCE: 'evidence',
}

export const STORAGE_TIER_LABEL = {
  [STORAGE_TIER.HOT]: '热存储',
  [STORAGE_TIER.WARM]: '温存储',
  [STORAGE_TIER.COLD]: '冷存储',
  [STORAGE_TIER.EVIDENCE]: '取证存储池',
}

/* ================================================================
   角色与数据权限
   ================================================================ */

export const ROLE = {
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  OPERATOR: 'operator',
  VIEWER: 'viewer',
}

export const ROLE_LABEL = {
  [ROLE.ADMIN]: '系统管理员',
  [ROLE.SUPERVISOR]: '监管主管',
  [ROLE.OPERATOR]: '业务操作员',
  [ROLE.VIEWER]: '只读访客',
}

export const ROLE_DESC = {
  [ROLE.ADMIN]: '全部权限，含最高密级数据',
  [ROLE.SUPERVISOR]: '可审批任务、可管理空域、可见受限数据',
  [ROLE.OPERATOR]: '可提交审批、可导出、仅见内部及以下数据',
  [ROLE.VIEWER]: '只读，仅见公开数据，不可导出',
}

/** 数据密级。等级值越大越敏感，用于可见性比较 */
export const ACCESS_LEVEL = {
  PUBLIC: 'public',
  INTERNAL: 'internal',
  RESTRICTED: 'restricted',
  CONFIDENTIAL: 'confidential',
}

export const ACCESS_LEVEL_LABEL = {
  [ACCESS_LEVEL.PUBLIC]: '公开',
  [ACCESS_LEVEL.INTERNAL]: '内部',
  [ACCESS_LEVEL.RESTRICTED]: '受限',
  [ACCESS_LEVEL.CONFIDENTIAL]: '机密',
}

export const ACCESS_LEVEL_TAG = {
  [ACCESS_LEVEL.PUBLIC]: 'tag-neutral',
  [ACCESS_LEVEL.INTERNAL]: 'tag-info',
  [ACCESS_LEVEL.RESTRICTED]: 'tag-warn',
  [ACCESS_LEVEL.CONFIDENTIAL]: 'tag-danger',
}

export const ACCESS_LEVEL_RANK = {
  [ACCESS_LEVEL.PUBLIC]: 0,
  [ACCESS_LEVEL.INTERNAL]: 1,
  [ACCESS_LEVEL.RESTRICTED]: 2,
  [ACCESS_LEVEL.CONFIDENTIAL]: 3,
}

/**
 * 角色权限矩阵。页面里一律通过 app store 的 can(action) 判定，不要直接读这张表。
 * maxAccessLevel 是数据可见性的唯一判据。
 */
export const ROLE_PERMISSION = {
  [ROLE.ADMIN]: {
    approveTask: true,
    editAirspace: true,
    exportData: true,
    verifyEvidence: true,
    maxAccessLevel: ACCESS_LEVEL.CONFIDENTIAL,
  },
  [ROLE.SUPERVISOR]: {
    approveTask: true,
    editAirspace: true,
    exportData: true,
    verifyEvidence: true,
    maxAccessLevel: ACCESS_LEVEL.RESTRICTED,
  },
  [ROLE.OPERATOR]: {
    approveTask: false,
    editAirspace: false,
    exportData: true,
    verifyEvidence: false,
    maxAccessLevel: ACCESS_LEVEL.INTERNAL,
  },
  [ROLE.VIEWER]: {
    approveTask: false,
    editAirspace: false,
    exportData: false,
    verifyEvidence: false,
    maxAccessLevel: ACCESS_LEVEL.PUBLIC,
  },
}

/* ================================================================
   取证存证链
   ================================================================ */

export const EVIDENCE_CHAIN = {
  CHAIN_ID: 'SH-LAW-CHAIN',
  HASH_ALGO: 'SHA-256',
  GENESIS_LABEL: '创世区块',
  /** 链首记录的前序哈希。必须是 null —— 校验时用它判定「这是创世区块」 */
  GENESIS_PREV: null,
}

export const VERIFY_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  PASS: 'pass',
  FAIL: 'fail',
}

export const VERIFY_STATUS_LABEL = {
  [VERIFY_STATUS.IDLE]: '未校验',
  [VERIFY_STATUS.RUNNING]: '校验中',
  [VERIFY_STATUS.PASS]: '校验通过',
  [VERIFY_STATUS.FAIL]: '校验失败',
}

export const VERIFY_STATUS_TAG = {
  [VERIFY_STATUS.IDLE]: 'tag-neutral',
  [VERIFY_STATUS.RUNNING]: 'tag-info',
  [VERIFY_STATUS.PASS]: 'tag-success',
  [VERIFY_STATUS.FAIL]: 'tag-danger',
}

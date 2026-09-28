<script setup>
/**
 * 任务执行页。
 *
 * 与监测总览的「任务执行」Tab 的区别：总览那个受事件筛选与下拉筛选联动，
 * 是「按事件追查」的视角；这里是全量任务的管理视图（OA 表格），
 * 可以按类型 / 状态 / 机队 / 区域 / 关键词任意组合筛选。
 *
 * 本页只读，不提供增删改——任务的派发与状态流转需要后端调度系统支撑，
 * 纯前端演示不做假动作。
 */

import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMonitorStore } from '../stores/monitor'
import { useAppStore } from '../stores/app'
import { LANDMARKS } from '../mock'
import {
  APPROVAL_ACTION,
  APPROVAL_ACTION_COLOR,
  APPROVAL_ACTION_LABEL,
  APPROVAL_STATUS,
  APPROVAL_STATUS_LABEL,
  APPROVAL_STATUS_TAG,
  APPROVAL_SUBMITTABLE,
  AVOID_STRATEGY_LABEL,
  DRONE_STATUS_LABEL,
  PRIORITY_LABEL,
  RETURN_MODE_LABEL,
  TASK_STATUS_LABEL,
  TASK_STATUS_TAG,
  TASK_TYPE_LABEL,
} from '../domain/constants'
import { toFixed, dateTime, shortDateTime } from '../utils/format'
import TopBar from '../components/layout/TopBar.vue'
import DataTable from '../components/common/DataTable.vue'
import ModalDialog from '../components/common/ModalDialog.vue'
import StatusTag from '../components/common/StatusTag.vue'

const store = useMonitorStore()
const app = useAppStore()
const route = useRoute()
const router = useRouter()

/* ---------------- 任务 ↔ 航线的双向关联 ---------------- */

const LANDMARK_ENTRIES = Object.entries(LANDMARKS)

/** 把锚点坐标反查成路口名称（内置航线只存了坐标，没有存名称） */
function landmarkNameOf(coord) {
  const hit = LANDMARK_ENTRIES.find(
    ([, c]) => Math.abs(c[0] - coord[0]) < 1e-6 && Math.abs(c[1] - coord[1]) < 1e-6
  )
  return hit ? hit[0] : '自定义点'
}

/** 跳到航线规划页并选中该航线 */
function goRoute(routeId) {
  if (!routeId) return
  router.push({ path: '/routes', query: { focus: routeId } })
}

/* ---------------- 选项 ---------------- */

const typeOptions = [
  { value: '', label: '全部类型' },
  ...Object.entries(TASK_TYPE_LABEL).map(([value, label]) => ({ value, label })),
]

const statusOptions = [
  { value: '', label: '全部状态' },
  ...Object.entries(TASK_STATUS_LABEL).map(([value, label]) => ({ value, label })),
]

const approvalOptions = [
  { value: '', label: '全部审批' },
  ...Object.entries(APPROVAL_STATUS_LABEL).map(([value, label]) => ({ value, label })),
]

const fleetOptions = computed(() => [
  { value: '', label: '全部机队' },
  ...store.fleets.map((fleet) => ({ value: fleet.id, label: fleet.name })),
])

const districtOptions = computed(() => [
  { value: '', label: '全部区域' },
  ...[...new Set(store.tasks.map((task) => task.district))].map((name) => ({
    value: name,
    label: name,
  })),
])

/* ---------------- 行数据 ---------------- */

const rows = computed(() =>
  store.tasks.map((task) => {
    const data = store.taskData.find((row) => row.taskId === task.id)
    const route = store.routeById(task.routeId)
    const drone = store.droneById(task.droneId)
    const fleet = store.fleets.find((item) => item.id === task.fleetId)
    return {
      ...task,
      typeLabel: TASK_TYPE_LABEL[task.type] || '—',
      statusLabel: TASK_STATUS_LABEL[task.status] || '—',
      statusTone: (TASK_STATUS_TAG[task.status] || 'tag-neutral').replace('tag-', ''),
      approvalLabel: APPROVAL_STATUS_LABEL[task.approvalStatus] || '—',
      approvalTone: (APPROVAL_STATUS_TAG[task.approvalStatus] || 'tag-neutral').replace(
        'tag-',
        ''
      ),
      submittedAt: task.approvalRecords.length ? task.approvalRecords[0].at : null,
      lastApprovalText: task.approvalAt ? shortDateTime(task.approvalAt) : '—',
      priorityLabel: PRIORITY_LABEL[task.priority] || '—',
      fleetName: fleet ? fleet.name : '—',
      routeName: route ? route.name : '—',
      routeCode: route ? route.code : '—',
      droneStatusLabel: drone ? DRONE_STATUS_LABEL[drone.status] : '—',
      distanceKm: data ? data.distanceKm : 0,
      durationMin: data ? data.durationMin : 0,
      maxAltitude: data ? data.maxAltitude : 0,
    }
  })
)

const statusSummary = computed(() => {
  const counter = {}
  store.tasks.forEach((task) => {
    counter[task.status] = (counter[task.status] || 0) + 1
  })
  return Object.entries(TASK_STATUS_LABEL).map(([key, label]) => ({
    key,
    label,
    value: counter[key] || 0,
  }))
})

/** 审批状态统计 */
const approvalCards = computed(() =>
  store.approvalSummary.map((item) => ({
    ...item,
    label: APPROVAL_STATUS_LABEL[item.key],
    tone: (APPROVAL_STATUS_TAG[item.key] || 'tag-neutral').replace('tag-', ''),
  }))
)

/* ---------------- 筛选 ---------------- */

const filters = reactive({
  type: '',
  status: '',
  approvalStatus: '',
  fleetId: '',
  district: '',
  keyword: '',
})

const activeFilterCount = computed(
  () =>
    [
      filters.type,
      filters.status,
      filters.approvalStatus,
      filters.fleetId,
      filters.district,
      filters.keyword.trim(),
    ].filter(Boolean).length
)

const filteredRows = computed(() => {
  let list = rows.value
  if (filters.type) list = list.filter((row) => row.type === filters.type)
  if (filters.status) list = list.filter((row) => row.status === filters.status)
  if (filters.approvalStatus) {
    list = list.filter((row) => row.approvalStatus === filters.approvalStatus)
  }
  if (filters.fleetId) list = list.filter((row) => row.fleetId === filters.fleetId)
  if (filters.district) list = list.filter((row) => row.district === filters.district)

  const keyword = filters.keyword.trim().toLowerCase()
  if (keyword) {
    list = list.filter((row) =>
      [row.code, row.name, row.road, row.district, row.droneId, row.routeName]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    )
  }
  return list
})

function resetFilters() {
  filters.type = ''
  filters.status = ''
  filters.approvalStatus = ''
  filters.fleetId = ''
  filters.district = ''
  filters.keyword = ''
}

/* ---------------- 详情弹窗 ---------------- */

const detailOpen = ref(false)
const detailId = ref(null)

const detailTask = computed(
  () => filteredRows.value.find((row) => row.id === detailId.value) || null
)

const detailAssets = computed(() =>
  detailTask.value ? store.dataAssets.filter((asset) => asset.taskId === detailTask.value.id) : []
)

const detailAreas = computed(() =>
  detailTask.value
    ? store.missionAreas.filter((area) => area.taskId === detailTask.value.id)
    : []
)

/** 当前任务执行的航线。详情弹窗里展示完整信息，并提供跳转入口 */
const detailRoute = computed(() => {
  if (!detailTask.value) return null
  const item = store.routeById(detailTask.value.routeId)
  if (!item) return null

  const anchors = item.anchors || []
  return {
    ...item,
    endpoints:
      anchors.length >= 2
        ? `${landmarkNameOf(anchors[0])} → ${landmarkNameOf(anchors[anchors.length - 1])}`
        : '—',
    anchorCount: anchors.length,
    avoidLabel: AVOID_STRATEGY_LABEL[item.avoidStrategy] || '—',
    returnLabel: RETURN_MODE_LABEL[item.returnMode] || '—',
    detourCount: (item.detourSegments || []).length,
  }
})

function openDetail(row) {
  detailId.value = row.id
  detailOpen.value = true
  approvalComment.value = ''
  approvalError.value = ''
}

/** 从航线规划页跳进来时（?focus=ROUTE-01）自动打开对应任务的详情 */
watch(
  () => route.query.focus,
  (focusId) => {
    if (!focusId) return
    const target = filteredRows.value.find((row) => row.id === focusId)
    if (target) {
      detailId.value = target.id
      detailOpen.value = true
    }
  },
  { immediate: true }
)

/* ---------------- 审批流转 ---------------- */

const approvalComment = ref('')
const approvalError = ref('')

const canApprove = computed(() => app.can('approveTask'))

/** 当前任务的审批记录（时间线用，已是时间正序） */
const detailApprovalRecords = computed(() =>
  detailTask.value ? store.approvalRecordsOf(detailTask.value.id) : []
)

/**
 * 当前状态下可执行的动作。
 * 注意审批状态与执行状态正交：审批通过不会改变任务的执行状态。
 */
const availableActions = computed(() => {
  const task = detailTask.value
  if (!task) return []

  const actions = []

  if (APPROVAL_SUBMITTABLE.includes(task.approvalStatus)) {
    actions.push({ key: APPROVAL_ACTION.SUBMIT, label: APPROVAL_ACTION_LABEL.submit, tone: 'primary' })
  }

  if (task.approvalStatus === APPROVAL_STATUS.SUBMITTED) {
    if (canApprove.value) {
      actions.push({ key: APPROVAL_ACTION.APPROVE, label: APPROVAL_ACTION_LABEL.approve, tone: 'primary' })
      actions.push({ key: APPROVAL_ACTION.REJECT, label: APPROVAL_ACTION_LABEL.reject, tone: 'danger' })
    }
    actions.push({ key: APPROVAL_ACTION.WITHDRAW, label: APPROVAL_ACTION_LABEL.withdraw, tone: 'plain' })
  }

  return actions
})

function needsComment(action) {
  return action === APPROVAL_ACTION.APPROVE || action === APPROVAL_ACTION.REJECT
}

function runApproval(action) {
  const task = detailTask.value
  if (!task) return

  if (needsComment(action) && !approvalComment.value.trim()) {
    approvalError.value = '通过或驳回必须填写审批意见'
    return
  }
  approvalError.value = ''

  const comment = approvalComment.value.trim()
  if (action === APPROVAL_ACTION.SUBMIT) store.submitApproval(task.id, comment || '提交审批')
  if (action === APPROVAL_ACTION.APPROVE) store.approveTask(task.id, comment)
  if (action === APPROVAL_ACTION.REJECT) store.rejectTask(task.id, comment)
  if (action === APPROVAL_ACTION.WITHDRAW) store.withdrawApproval(task.id, comment || '撤回申请')

  approvalComment.value = ''
}

/* ---------------- 表格列 ---------------- */

const columns = [
  { key: 'code', label: '任务编号', width: '100px' },
  { key: 'name', label: '任务名称', width: '190px' },
  { key: 'typeLabel', label: '任务类型', width: '92px' },
  { key: 'statusLabel', label: '执行状态', width: '88px' },
  { key: 'approvalLabel', label: '审批状态', width: '88px' },
  { key: 'droneId', label: '关联无人机', width: '100px' },
  { key: 'fleetName', label: '所属机队', width: '100px' },
  { key: 'district', label: '所属区', width: '88px' },
  { key: 'routeName', label: '执行航线', width: '186px' },
  { key: 'progress', label: '进度', width: '124px' },
  { key: 'distanceKm', label: '里程', width: '78px', align: 'right' },
  { key: 'durationMin', label: '时长', width: '74px', align: 'right' },
  { key: 'actions', label: '操作', width: '88px', align: 'right' },
]
</script>

<template>
  <div class="page">
    <TopBar />

    <div class="page-body">
      <header class="page-head">
        <div>
          <h1 class="page-title">任务执行</h1>
          <p class="page-sub">
            共 {{ rows.length }} 条任务 ·
            <template v-for="(item, index) in statusSummary" :key="item.key">
              <template v-if="index"> · </template>{{ item.label }} {{ item.value }}
            </template>
          </p>
          <p class="page-sub page-sub-second">
            审批：
            <template v-for="(item, index) in approvalCards" :key="item.key">
              <template v-if="index"> · </template>
              <span :class="{ 'is-pending': item.key === 'submitted' && item.value }">
                {{ item.label }} {{ item.value }}
              </span>
            </template>
            <span class="muted">· 审批状态与执行状态相互独立，通过不等于已派发</span>
          </p>
        </div>

        <div class="summary">
          <div v-for="item in statusSummary" :key="item.key" class="summary-item">
            <span class="summary-label">{{ item.label }}</span>
            <span class="summary-value num">{{ item.value }}</span>
          </div>
        </div>
      </header>

      <div class="toolbar">
        <label class="field toolbar-field">
          <span class="field-label">任务类型</span>
          <select v-model="filters.type" class="select">
            <option v-for="item in typeOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>

        <label class="field toolbar-field">
          <span class="field-label">执行状态</span>
          <select v-model="filters.status" class="select">
            <option v-for="item in statusOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>

        <label class="field toolbar-field">
          <span class="field-label">审批状态</span>
          <select v-model="filters.approvalStatus" class="select">
            <option v-for="item in approvalOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>

        <label class="field toolbar-field">
          <span class="field-label">所属机队</span>
          <select v-model="filters.fleetId" class="select">
            <option v-for="item in fleetOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>

        <label class="field toolbar-field">
          <span class="field-label">所属区</span>
          <select v-model="filters.district" class="select">
            <option v-for="item in districtOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>

        <label class="field toolbar-field toolbar-field-wide">
          <span class="field-label">关键词</span>
          <input
            v-model="filters.keyword"
            class="input input-search"
            type="text"
            placeholder="任务编号 / 名称 / 道路 / 无人机编号"
          />
        </label>

        <button
          class="btn btn-xs toolbar-reset"
          type="button"
          :disabled="!activeFilterCount"
          @click="resetFilters"
        >
          重置{{ activeFilterCount ? ` (${activeFilterCount})` : '' }}
        </button>
      </div>

      <section class="card table-card">
        <div class="card-head">
          <h2 class="card-title">任务列表</h2>
          <div class="card-head-spacer" />
          <span class="muted num">{{ filteredRows.length }} / {{ rows.length }} 条</span>
        </div>

        <DataTable
          :columns="columns"
          :rows="filteredRows"
          min-width="1400px"
          clickable
          empty-text="没有匹配的任务，试试重置筛选"
          @row-click="openDetail"
        >
          <template #code="{ row }">
            <span class="num">{{ row.code }}</span>
          </template>

          <template #name="{ row }">
            <span :title="row.name">{{ row.name }}</span>
          </template>

          <template #statusLabel="{ row }">
            <StatusTag :text="row.statusLabel" :tone="row.statusTone" />
          </template>

          <template #approvalLabel="{ row }">
            <StatusTag :text="row.approvalLabel" :tone="row.approvalTone" />
          </template>

          <template #droneId="{ row }">
            <span class="num" :title="row.droneStatusLabel">{{ row.droneId }}</span>
          </template>

          <template #routeName="{ row }">
            <button
              class="link-cell"
              type="button"
              :title="`查看航线 ${row.routeCode} 的完整信息`"
              @click.stop="goRoute(row.routeId)"
            >
              <span class="link-code num">{{ row.routeCode }}</span>
              <span class="link-text">{{ row.routeName }}</span>
            </button>
          </template>

          <template #progress="{ row }">
            <span class="progress">
              <span class="progress-bar">
                <i :class="`tone-${row.status}`" :style="{ width: `${row.progress}%` }" />
              </span>
              <span class="progress-text num">{{ row.progress }}%</span>
            </span>
          </template>

          <template #distanceKm="{ row }">
            <span class="num">{{ toFixed(row.distanceKm, 1) }} km</span>
          </template>

          <template #durationMin="{ row }">
            <span class="num">{{ row.durationMin }} min</span>
          </template>

          <template #actions="{ row }">
            <button class="btn btn-xs" type="button" @click.stop="openDetail(row)">详情</button>
          </template>
        </DataTable>
      </section>
    </div>

    <ModalDialog v-model="detailOpen" title="任务详情" width="600px">
      <div v-if="detailTask" class="detail">
        <div class="detail-head">
          <div>
            <p class="detail-name">{{ detailTask.name }}</p>
            <p class="detail-code num">{{ detailTask.code }}</p>
          </div>
          <StatusTag :text="detailTask.statusLabel" :tone="detailTask.statusTone" />
        </div>

        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-key">任务类型</span>
            <span class="detail-val">{{ detailTask.typeLabel }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-key">优先级</span>
            <span class="detail-val">{{ detailTask.priorityLabel }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-key">关联无人机</span>
            <span class="detail-val num">
              {{ detailTask.droneId }} · {{ detailTask.droneStatusLabel }}
            </span>
          </div>
          <div class="detail-item">
            <span class="detail-key">所属机队</span>
            <span class="detail-val">{{ detailTask.fleetName }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-key">任务区域</span>
            <span class="detail-val">{{ detailTask.district }} {{ detailTask.road }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-key">执行航线</span>
            <span class="detail-val num">{{ detailTask.routeCode }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-key">航线里程</span>
            <span class="detail-val num">{{ toFixed(detailTask.distanceKm, 1) }} km</span>
          </div>
          <div class="detail-item">
            <span class="detail-key">计划时长</span>
            <span class="detail-val num">{{ detailTask.durationMin }} min</span>
          </div>
          <div class="detail-item">
            <span class="detail-key">最大高度</span>
            <span class="detail-val num">{{ detailTask.maxAltitude }} m</span>
          </div>
          <div class="detail-item">
            <span class="detail-key">任务进度</span>
            <span class="detail-val num">{{ detailTask.progress }}%</span>
          </div>
        </div>

        <div v-if="detailRoute" class="route-block">
          <div class="route-head">
            <span class="detail-block-title">执行航线</span>
            <button class="btn btn-xs" type="button" @click="goRoute(detailRoute.id)">
              查看航线详情
            </button>
          </div>

          <p class="route-name">
            <span class="route-code num">{{ detailRoute.code }}</span>
            {{ detailRoute.name }}
          </p>

          <div class="route-grid">
            <span class="route-fact">
              <em>起止点</em>
              <b>{{ detailRoute.endpoints }}</b>
            </span>
            <span class="route-fact">
              <em>里程 / 时长</em>
              <b class="num">{{ detailRoute.distanceKm }} km · {{ detailRoute.durationMin }} min</b>
            </span>
            <span class="route-fact">
              <em>锚点 / 轨迹点</em>
              <b class="num">{{ detailRoute.anchorCount }} 个 · {{ detailRoute.path.length }} 点</b>
            </span>
            <span class="route-fact">
              <em>避障策略</em>
              <b>
                {{ detailRoute.avoidLabel }}
                <span v-if="detailRoute.detourCount" class="detour-mark">
                  绕行 {{ detailRoute.detourCount }}
                </span>
              </b>
            </span>
            <span class="route-fact">
              <em>返航点</em>
              <b>{{ detailRoute.returnPointName }}</b>
            </span>
            <span class="route-fact">
              <em>返航模式</em>
              <b>{{ detailRoute.returnLabel }}</b>
            </span>
          </div>
        </div>

        <div class="approval-block">
          <div class="approval-head">
            <span class="detail-block-title">任务审批</span>
            <StatusTag :text="detailTask.approvalLabel" :tone="detailTask.approvalTone" />
          </div>

          <ol v-if="detailApprovalRecords.length" class="timeline">
            <li v-for="record in detailApprovalRecords" :key="record.id" class="timeline-item">
              <i
                class="timeline-dot"
                :style="{ background: APPROVAL_ACTION_COLOR[record.action] }"
              />
              <div class="timeline-body">
                <span class="timeline-title">
                  {{ APPROVAL_ACTION_LABEL[record.action] }}
                  <span class="timeline-operator">{{ record.operator }}</span>
                </span>
                <span v-if="record.comment" class="timeline-comment">{{ record.comment }}</span>
                <span class="timeline-time num">{{ dateTime(record.at) }}</span>
              </div>
            </li>
          </ol>
          <p v-else class="muted detail-none">尚未提交审批</p>

          <div v-if="availableActions.length" class="approval-actions">
            <input
              v-model="approvalComment"
              class="input"
              type="text"
              :placeholder="
                availableActions.some((a) => a.key === 'approve')
                  ? '审批意见（通过 / 驳回必填）'
                  : '备注（选填）'
              "
            />
            <div class="approval-btns">
              <button
                v-for="action in availableActions"
                :key="action.key"
                class="btn"
                :class="{
                  'btn-primary': action.tone === 'primary',
                  'btn-danger': action.tone === 'danger',
                }"
                type="button"
                :disabled="needsComment(action.key) && !approvalComment.trim()"
                @click="runApproval(action.key)"
              >
                {{ action.label }}
              </button>
            </div>
            <p v-if="approvalError" class="form-error">{{ approvalError }}</p>
          </div>
          <p v-else class="muted detail-none">
            当前角色（{{ app.roleLabel }}）无审批权限，或该任务已无可执行动作
          </p>
        </div>

        <div v-if="detailAreas.length" class="detail-block">
          <p class="detail-block-title">覆盖任务区域</p>
          <div class="chip-list">
            <span v-for="area in detailAreas" :key="area.id" class="tag tag-info">
              {{ area.name }} · {{ toFixed(area.areaKm2, 1) }} km²
            </span>
          </div>
        </div>

        <div class="detail-block">
          <p class="detail-block-title">采集数据资产（{{ detailAssets.length }}）</p>
          <ul v-if="detailAssets.length" class="asset-list">
            <li v-for="asset in detailAssets" :key="asset.id" class="asset-row">
              <span class="asset-name">{{ asset.categoryLabel }}</span>
              <span class="asset-meta num">
                {{ toFixed(asset.amount, 1) }} {{ asset.unit }} ·
                {{ asset.storage }} · {{ asset.status }}
              </span>
            </li>
          </ul>
          <p v-else class="muted detail-none">该任务暂无采集数据</p>
        </div>

        <p v-if="detailTask.remark" class="detail-remark">{{ detailTask.remark }}</p>
      </div>
    </ModalDialog>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.page-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  padding: var(--gap);
}

.page-head {
  display: flex;
  flex: none;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.page-title {
  font-size: var(--fs-16);
  font-weight: 600;
}

.page-sub {
  margin-top: 4px;
  font-size: var(--fs-12);
  color: var(--text-muted);
}

.summary {
  display: flex;
  gap: 8px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 74px;
  padding: 6px 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-card);
}

.summary-label {
  font-size: var(--fs-11);
  color: var(--text-muted);
}

.summary-value {
  font-size: var(--fs-16);
  font-weight: 600;
}

/* ---- 工具栏 ---- */
.toolbar {
  display: flex;
  flex: none;
  align-items: flex-end;
  gap: 10px;
}

.toolbar-field {
  width: 138px;
}

.toolbar-field-wide {
  flex: 1;
  max-width: 300px;
}

.toolbar-reset {
  height: 28px;
}

.table-card {
  flex: 1;
  min-height: 0;
}

/* ---- 进度条 ---- */
.progress {
  display: flex;
  align-items: center;
  gap: 7px;
}

.progress-bar {
  flex: 1;
  height: 4px;
  overflow: hidden;
  background: var(--border);
  border-radius: var(--radius-pill);
}

.progress-bar i {
  display: block;
  height: 100%;
  border-radius: var(--radius-pill);
}

.tone-executing {
  background: var(--accent);
}

.tone-done {
  background: var(--success);
}

.tone-pending {
  background: var(--text-muted);
}

.tone-aborted {
  background: var(--danger);
}

.progress-text {
  flex: none;
  font-size: var(--fs-11);
  color: var(--text-muted);
}

/* ---- 详情弹窗 ---- */
.detail {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.detail-name {
  font-size: var(--fs-14);
  font-weight: 600;
}

.detail-code {
  margin-top: 3px;
  font-size: var(--fs-11);
  color: var(--text-muted);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 14px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.detail-key {
  font-size: var(--fs-11);
  color: var(--text-muted);
}

.detail-val {
  font-size: var(--fs-12);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.detail-block-title {
  font-size: var(--fs-12);
  font-weight: 600;
}

.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.asset-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.asset-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 9px;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.asset-name {
  font-size: var(--fs-12);
  font-weight: 500;
}

.asset-meta {
  font-size: var(--fs-11);
  color: var(--text-muted);
}

.detail-none {
  font-size: var(--fs-12);
}

.detail-remark {
  padding: 8px 10px;
  font-size: var(--fs-12);
  line-height: 1.6;
  color: var(--text-secondary);
  background: var(--surface-sunken);
  border-radius: var(--radius-sm);
}

/* ---- 审批 ---- */
.page-sub-second {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.page-sub-second .is-pending {
  font-weight: 500;
  color: var(--warn);
}

.approval-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.approval-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.timeline {
  display: flex;
  flex-direction: column;
  padding-left: 3px;
}

.timeline-item {
  position: relative;
  display: flex;
  gap: 9px;
  padding-bottom: 11px;
}

.timeline-item:not(:last-child)::before {
  content: "";
  position: absolute;
  top: 13px;
  bottom: 0;
  left: 3px;
  width: 1px;
  background: var(--border-strong);
}

.timeline-dot {
  flex: none;
  width: 7px;
  height: 7px;
  margin-top: 5px;
  border-radius: 50%;
}

.timeline-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.timeline-title {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: var(--fs-12);
  font-weight: 500;
}

.timeline-operator {
  font-size: var(--fs-11);
  font-weight: 400;
  color: var(--text-muted);
}

.timeline-comment {
  font-size: var(--fs-12);
  line-height: 1.55;
  color: var(--text-secondary);
}

.timeline-time {
  font-size: 10px;
  color: var(--text-muted);
}

.approval-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.approval-btns {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.form-error {
  font-size: var(--fs-11);
  color: var(--danger);
}

/* ---- 任务 ↔ 航线关联 ---- */
.link-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  padding: 0;
  text-align: left;
  background: transparent;
  border: none;
}

.link-code {
  flex: none;
  font-size: 10px;
  color: var(--accent);
}

.link-text {
  overflow: hidden;
  color: var(--accent);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.link-cell:hover .link-text {
  text-decoration: underline;
}

.route-block {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.route-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.route-name {
  display: flex;
  align-items: baseline;
  gap: 7px;
  font-size: var(--fs-13);
  font-weight: 500;
}

.route-code {
  font-size: var(--fs-11);
  font-weight: 400;
  color: var(--accent);
}

.route-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px 12px;
}

.route-fact {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.route-fact em {
  font-size: 10px;
  font-style: normal;
  color: var(--text-muted);
}

.route-fact b {
  font-size: var(--fs-12);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detour-mark {
  padding: 0 5px;
  font-size: 10px;
  font-weight: 400;
  color: #e07b39;
  background: rgba(224, 123, 57, 0.12);
  border-radius: var(--radius-sm);
}
</style>

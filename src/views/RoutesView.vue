<script setup>
/**
 * 航线规划页。
 *
 * 与监测总览里的「航线规划」Tab 的区别：
 * 总览那个是只读的筛选视图，这里是可增删改的管理视图（OA 表格）。
 * 两者共用 monitor store 里的同一份 routes 数据，所以这里改了航线，
 * 总览的地图与筛选结果会同步变化。
 *
 * 规划路径的生成方式：从 LANDMARKS 里挑真实路口当锚点，
 * 用 Catmull-Rom 样条插值成平滑轨迹，里程与时长都由轨迹算出来，不手填。
 */

import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMonitorStore } from '../stores/monitor'
import {
  DISTRICT_CENTERS,
  LANDMARKS,
  smoothPath,
  polylineLength,
  deriveDetourSegments,
} from '../mock'
import {
  AVOID_STRATEGY,
  AVOID_STRATEGY_LABEL,
  OBSTACLE_TYPE_LABEL,
  RETURN_MODE,
  RETURN_MODE_LABEL,
  ROUTE_CRUISE_SPEED_KMH,
  ROUTE_DEFAULT_ALTITUDE,
  ROUTE_MAX_WAYPOINTS,
} from '../domain/constants'
import { toFixed } from '../utils/format'
import TopBar from '../components/layout/TopBar.vue'
import DataTable from '../components/common/DataTable.vue'
import ModalDialog from '../components/common/ModalDialog.vue'
import RoutePreviewMap from '../components/map/RoutePreviewMap.vue'

const store = useMonitorStore()
const route = useRoute()
const router = useRouter()

/** 跳到任务执行页并打开该任务的详情 */
function goTask(taskId) {
  if (!taskId) return
  router.push({ path: '/tasks', query: { focus: taskId } })
}

/* ---------------- 选项 ---------------- */

const LANDMARK_ENTRIES = Object.entries(LANDMARKS)

const districtOptions = Object.keys(DISTRICT_CENTERS).map((name) => ({ value: name, label: name }))
const landmarkOptions = LANDMARK_ENTRIES.map(([name]) => ({ value: name, label: name }))

const boundOptions = [
  { value: '', label: '全部状态' },
  { value: 'bound', label: '已绑定任务' },
  { value: 'free', label: '未绑定任务' },
]

/* ---------------- 行数据 ---------------- */

/** 把锚点坐标反查成路口名称——内置航线没有存名称，只能反查 */
function landmarkNameOf(coord) {
  const [lng, lat] = coord
  const hit = LANDMARK_ENTRIES.find(
    ([, c]) => Math.abs(c[0] - lng) < 1e-6 && Math.abs(c[1] - lat) < 1e-6
  )
  return hit ? hit[0] : '自定义点'
}

function resolveAnchorNames(route) {
  if (route.anchorNames && route.anchorNames.length === route.anchors.length) {
    return route.anchorNames
  }
  return route.anchors.map(landmarkNameOf)
}

const rows = computed(() =>
  store.routes.map((route) => {
    const boundTasks = store.tasksUsingRoute(route.id)
    const anchorNames = resolveAnchorNames(route)
    return {
      ...route,
      anchorNames,
      endpoints: `${anchorNames[0] || '—'} → ${anchorNames[anchorNames.length - 1] || '—'}`,
      anchorText: anchorNames.join(' · '),
      boundTasks,
      boundLabel: boundTasks.map((task) => task.code).join('、'),
      avoidStrategyLabel: AVOID_STRATEGY_LABEL[route.avoidStrategy] || '—',
      returnModeLabel: RETURN_MODE_LABEL[route.returnMode] || '—',
      detourCount: (route.detourSegments || []).length,
      detourText: (route.detourSegments || [])
        .map((segment) => OBSTACLE_TYPE_LABEL[segment.reason])
        .join('、'),
    }
  })
)

const customCount = computed(() => store.routes.filter((route) => route.isCustom).length)

/* ---------------- 筛选 ---------------- */

const filters = reactive({ district: '', bound: '', keyword: '' })

const activeFilterCount = computed(
  () => [filters.district, filters.bound, filters.keyword.trim()].filter(Boolean).length
)

const filteredRows = computed(() => {
  let list = rows.value
  if (filters.district) list = list.filter((row) => row.district === filters.district)
  if (filters.bound === 'bound') list = list.filter((row) => row.boundTasks.length > 0)
  if (filters.bound === 'free') list = list.filter((row) => !row.boundTasks.length)

  const keyword = filters.keyword.trim().toLowerCase()
  if (keyword) {
    list = list.filter((row) =>
      [row.code, row.name, row.district, row.road, row.anchorText]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    )
  }
  return list
})

function resetFilters() {
  filters.district = ''
  filters.bound = ''
  filters.keyword = ''
}

/* ---------------- 选中与预览 ---------------- */

const selectedId = ref(null)

const selectedRoute = computed(() => rows.value.find((row) => row.id === selectedId.value) || null)

watch(
  filteredRows,
  (list) => {
    if (!list.length) {
      selectedId.value = null
      return
    }
    if (!list.some((row) => row.id === selectedId.value)) {
      selectedId.value = list[0].id
    }
  },
  { immediate: true }
)

/**
 * 从任务执行页跳进来时（`#/routes?focus=ROUTE-01`）自动选中该航线。
 * 必须注册在 filteredRows 的 watch 之后：那个 watch 会把选中项重置为第一行，
 * 先注册先执行，这里再覆盖成目标航线。
 */
watch(
  () => route.query.focus,
  (focusId) => {
    if (!focusId) return
    const target = filteredRows.value.find((row) => row.id === focusId)
    if (target) selectedId.value = target.id
  },
  { immediate: true }
)

function onRowClick(row) {
  selectedId.value = row.id
}

/* ---------------- 表单 ---------------- */

const dialogOpen = ref(false)
const editingId = ref(null)

const form = reactive({
  name: '',
  district: '',
  road: '',
  start: '',
  waypoints: [''],
  end: '',
  altitude: ROUTE_DEFAULT_ALTITUDE,
  remark: '',
  // ---- 避障与返航 ----
  avoidStrategy: AVOID_STRATEGY.AUTO_DETOUR,
  obstacleClearanceM: 30,
  minSafeAltitude: 60,
  maxSafeAltitude: 180,
  returnPointName: '',
  returnMode: RETURN_MODE.AUTO,
  returnBatteryThreshold: 25,
  rtlAltitude: ROUTE_DEFAULT_ALTITUDE + 20,
})

const errors = reactive({})

function clearErrors() {
  Object.keys(errors).forEach((key) => delete errors[key])
}

function resetForm() {
  form.name = ''
  form.district = ''
  form.road = ''
  form.start = ''
  form.waypoints = ['']
  form.end = ''
  form.altitude = ROUTE_DEFAULT_ALTITUDE
  form.remark = ''
  form.avoidStrategy = AVOID_STRATEGY.AUTO_DETOUR
  form.obstacleClearanceM = 30
  form.minSafeAltitude = 60
  form.maxSafeAltitude = 180
  form.returnPointName = ''
  form.returnMode = RETURN_MODE.AUTO
  form.returnBatteryThreshold = 25
  form.rtlAltitude = ROUTE_DEFAULT_ALTITUDE + 20
  clearErrors()
}

function openCreate() {
  editingId.value = null
  resetForm()
  dialogOpen.value = true
}

function openEdit(row) {
  editingId.value = row.id
  resetForm()
  const names = row.anchorNames
  form.name = row.name
  form.district = row.district
  form.road = row.road
  form.start = names[0] || ''
  form.end = names[names.length - 1] || ''
  const middle = names.slice(1, -1)
  form.waypoints = middle.length ? middle : ['']
  form.altitude = row.altitude || ROUTE_DEFAULT_ALTITUDE
  form.remark = row.remark || ''
  form.avoidStrategy = row.avoidStrategy || AVOID_STRATEGY.AUTO_DETOUR
  form.obstacleClearanceM = row.obstacleClearanceM ?? 30
  form.minSafeAltitude = row.minSafeAltitude ?? 60
  form.maxSafeAltitude = row.maxSafeAltitude ?? 180
  form.returnPointName = row.returnPointName || names[0] || ''
  form.returnMode = row.returnMode || RETURN_MODE.AUTO
  form.returnBatteryThreshold = row.returnBatteryThreshold ?? 25
  form.rtlAltitude = row.rtlAltitude || (row.altitude || ROUTE_DEFAULT_ALTITUDE) + 20
  dialogOpen.value = true
}

/** 途经点增减 */
function addWaypoint() {
  if (form.waypoints.length >= ROUTE_MAX_WAYPOINTS) return
  form.waypoints.push('')
}

function removeWaypoint(index) {
  form.waypoints.splice(index, 1)
  if (!form.waypoints.length) form.waypoints.push('')
}

/* ---------------- 路径与里程的实时推导 ---------------- */

const formAnchorNames = computed(() =>
  [form.start, ...form.waypoints.filter(Boolean), form.end].filter(Boolean)
)

const formAnchors = computed(() =>
  formAnchorNames.value.map((name) => LANDMARKS[name]).filter(Boolean)
)

const formPath = computed(() => {
  if (formAnchors.value.length < 2) return null
  const path = smoothPath(formAnchors.value, 9)
  return {
    anchors: formAnchors.value,
    path,
    distanceKm: Number(polylineLength(path).toFixed(1)),
  }
})

/** 时长不手填，按巡航速度从里程推出来，避免出现「10 公里飞 5 分钟」这种不合理数据 */
const formDuration = computed(() => {
  if (!formPath.value) return null
  return Math.round((formPath.value.distanceKm / ROUTE_CRUISE_SPEED_KMH) * 60)
})

/** 表单里的即时预览对象，喂给预览地图 */
const formPreviewRoute = computed(() => {
  if (!formPath.value) return null
  return {
    id: 'preview',
    color: '#2f6feb',
    anchors: formPath.value.anchors,
    path: formPath.value.path,
    // 与保存后的结果一致：绕行段由锚点派生，返航点取表单里选的路口
    detourSegments: deriveDetourSegments(formPath.value.anchors, 20240920),
    returnPoint: form.returnPointName
      ? LANDMARKS[form.returnPointName]
      : formPath.value.anchors[0],
  }
})

/* ---------------- 校验与提交 ---------------- */

function validate() {
  clearErrors()
  if (!form.name.trim()) errors.name = '请填写航线名称'
  if (!form.district) errors.district = '请选择所属区'
  if (!form.start) errors.start = '请选择起点'
  if (!form.end) errors.end = '请选择终点'
  if (form.start && form.end && form.start === form.end) errors.end = '终点不能与起点相同'

  const points = formAnchorNames.value
  if (new Set(points).size !== points.length) errors.waypoints = '途经点不能重复'
  if (points.length < 2) errors.start = errors.start || '至少需要起点和终点两个锚点'

  return Object.keys(errors).length === 0
}

function nextCode() {
  const used = new Set(store.routes.map((route) => route.code))
  let n = 1
  while (used.has(`RT-N${String(n).padStart(2, '0')}`)) n += 1
  return `RT-N${String(n).padStart(2, '0')}`
}

function submit() {
  if (!validate()) return

  const names = formAnchorNames.value
  const returnPointName = form.returnPointName || names[0]
  const payload = {
    name: form.name.trim(),
    district: form.district,
    road: form.road.trim(),
    anchors: names.map((name) => LANDMARKS[name]),
    anchorNames: names,
    durationMin: formDuration.value || 0,
    altitude: Number(form.altitude) || ROUTE_DEFAULT_ALTITUDE,
    remark: form.remark.trim(),
    // ---- 避障与返航 ----
    avoidStrategy: form.avoidStrategy,
    obstacleClearanceM: Number(form.obstacleClearanceM) || 30,
    minSafeAltitude: Number(form.minSafeAltitude) || 60,
    maxSafeAltitude: Number(form.maxSafeAltitude) || 180,
    returnPoint: LANDMARKS[returnPointName] || names.map((name) => LANDMARKS[name])[0],
    returnPointName,
    returnMode: form.returnMode,
    returnBatteryThreshold: Number(form.returnBatteryThreshold) || 25,
    rtlAltitude: Number(form.rtlAltitude) || 120,
  }

  if (editingId.value) {
    store.updateRoute(editingId.value, payload)
  } else {
    payload.code = nextCode()
    const created = store.addRoute(payload)
    selectedId.value = created.id
  }
  dialogOpen.value = false
}

/* ---------------- 删除 ---------------- */

const confirmOpen = ref(false)
const pendingDelete = ref(null)

const deleteBlocked = computed(
  () => Boolean(pendingDelete.value && pendingDelete.value.boundTasks.length)
)

function askDelete(row) {
  if (row.boundTasks.length) return
  pendingDelete.value = row
  confirmOpen.value = true
}

function confirmDelete() {
  if (!pendingDelete.value || deleteBlocked.value) return
  store.removeRoute(pendingDelete.value.id)
  if (selectedId.value === pendingDelete.value.id) selectedId.value = null
  confirmOpen.value = false
  pendingDelete.value = null
}

/* ---------------- 表格列 ---------------- */

const columns = [
  { key: 'code', label: '航线编号', width: '96px' },
  { key: 'name', label: '航线名称', width: '190px' },
  { key: 'district', label: '所属区', width: '88px' },
  { key: 'road', label: '所在道路', width: '110px' },
  { key: 'endpoints', label: '起止点', width: '170px' },
  { key: 'distanceKm', label: '里程', width: '78px', align: 'right' },
  { key: 'durationMin', label: '时长', width: '72px', align: 'right' },
  { key: 'avoidStrategyLabel', label: '避障策略', width: '100px' },
  { key: 'returnPointName', label: '返航点', width: '104px' },
  { key: 'boundLabel', label: '绑定任务', width: '104px' },
  { key: 'source', label: '来源', width: '76px' },
  { key: 'actions', label: '操作', width: '130px', align: 'right' },
]
</script>

<template>
  <div class="page">
    <TopBar />

    <div class="page-body">
      <header class="page-head">
        <div>
          <h1 class="page-title">航线规划</h1>
          <p class="page-sub">
            共 {{ rows.length }} 条航线 · 其中 {{ customCount }} 条为自定义规划 ·
            修改会同步到监测总览地图
          </p>
        </div>
        <button class="btn btn-primary" type="button" @click="openCreate">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M6 2v8M2 6h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>
          新建航线
        </button>
      </header>

      <div class="toolbar">
        <label class="field toolbar-field">
          <span class="field-label">所属区</span>
          <select v-model="filters.district" class="select">
            <option value="">全部区域</option>
            <option v-for="item in districtOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>

        <label class="field toolbar-field">
          <span class="field-label">绑定状态</span>
          <select v-model="filters.bound" class="select">
            <option v-for="item in boundOptions" :key="item.value" :value="item.value">
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
            placeholder="航线编号 / 名称 / 道路 / 途经点"
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

      <div class="content">
        <section class="card table-card">
          <div class="card-head">
            <h2 class="card-title">航线列表</h2>
            <div class="card-head-spacer" />
            <span class="muted num">{{ filteredRows.length }} / {{ rows.length }} 条</span>
          </div>

          <DataTable
            :columns="columns"
            :rows="filteredRows"
            :active-key="selectedId"
            min-width="1340px"
            clickable
            empty-text="没有匹配的航线，试试重置筛选"
            @row-click="onRowClick"
          >
            <template #code="{ row }">
              <span class="num">{{ row.code }}</span>
            </template>

            <template #name="{ row }">
              <span :title="row.name">{{ row.name }}</span>
            </template>

            <template #endpoints="{ row }">
              <span :title="row.anchorText">{{ row.endpoints }}</span>
            </template>

            <template #distanceKm="{ row }">
              <span class="num">{{ toFixed(row.distanceKm, 1) }} km</span>
            </template>

            <template #durationMin="{ row }">
              <span class="num">{{ row.durationMin }} min</span>
            </template>

            <template #avoidStrategyLabel="{ row }">
              <span class="avoid-cell" :title="row.detourCount ? `绕行段：${row.detourText}` : '无绕行段'">
                {{ row.avoidStrategyLabel }}
                <span v-if="row.detourCount" class="detour-mark">绕行 {{ row.detourCount }}</span>
              </span>
            </template>

            <template #returnPointName="{ row }">
              <span :title="`${row.returnModeLabel} · 返航高度 ${row.rtlAltitude} 米`">
                {{ row.returnPointName }}
              </span>
            </template>

            <template #boundLabel="{ row }">
              <span v-if="!row.boundTasks.length" class="tag tag-neutral">未绑定</span>
              <button
                v-for="task in row.boundTasks"
                :key="task.id"
                class="link-cell"
                type="button"
                :title="`查看任务 ${task.code} 的详情`"
                @click.stop="goTask(task.id)"
              >
                <span class="link-code num">{{ task.code }}</span>
              </button>
            </template>

            <template #source="{ row }">
              <span class="tag" :class="row.isCustom ? 'tag-warn' : 'tag-neutral'">
                {{ row.isCustom ? '自定义' : '内置' }}
              </span>
            </template>

            <template #actions="{ row }">
              <span class="row-actions">
                <button class="btn btn-xs" type="button" @click.stop="openEdit(row)">编辑</button>
                <button
                  class="btn btn-xs danger-text"
                  type="button"
                  :disabled="row.boundTasks.length > 0"
                  :title="row.boundTasks.length ? '该航线已被任务占用，需先解除绑定' : '删除该航线'"
                  @click.stop="askDelete(row)"
                >
                  删除
                </button>
              </span>
            </template>
          </DataTable>
        </section>

        <aside class="card preview-card">
          <div class="card-head">
            <h2 class="card-title">轨迹预览</h2>
            <div class="card-head-spacer" />
            <span v-if="selectedRoute" class="muted num">{{ selectedRoute.code }}</span>
          </div>

          <div class="card-body preview-body">
            <RoutePreviewMap :route="selectedRoute" />

            <dl v-if="selectedRoute" class="preview-meta">
              <div class="preview-row">
                <dt>航线名称</dt>
                <dd>{{ selectedRoute.name }}</dd>
              </div>
              <div class="preview-row">
                <dt>锚点序列</dt>
                <dd class="preview-anchors">{{ selectedRoute.anchorText }}</dd>
              </div>
              <div class="preview-row">
                <dt>里程 / 时长</dt>
                <dd class="num">
                  {{ toFixed(selectedRoute.distanceKm, 1) }} km ·
                  {{ selectedRoute.durationMin }} min
                </dd>
              </div>
              <div class="preview-row">
                <dt>绑定任务</dt>
                <dd>
                  <template v-if="selectedRoute.boundTasks.length">
                    <button
                      v-for="task in selectedRoute.boundTasks"
                      :key="task.id"
                      class="link-cell"
                      type="button"
                      :title="`查看任务 ${task.code} 的详情`"
                      @click="goTask(task.id)"
                    >
                      <span class="link-code num">{{ task.code }}</span>
                    </button>
                  </template>
                  <template v-else>未绑定</template>
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>

    <ModalDialog
      v-model="dialogOpen"
      :title="editingId ? '编辑航线' : '新建航线'"
      width="660px"
    >
      <div class="form">
        <div class="form-grid">
          <label class="field">
            <span class="field-label">航线名称 *</span>
            <input v-model="form.name" class="input" type="text" placeholder="如：陆家嘴世纪大道巡查线" />
            <span v-if="errors.name" class="form-error">{{ errors.name }}</span>
          </label>

          <label class="field">
            <span class="field-label">所属区 *</span>
            <select v-model="form.district" class="select">
              <option value="">请选择</option>
              <option v-for="item in districtOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </select>
            <span v-if="errors.district" class="form-error">{{ errors.district }}</span>
          </label>

          <label class="field">
            <span class="field-label">所在道路</span>
            <input v-model="form.road" class="input" type="text" placeholder="如：世纪大道" />
          </label>

          <label class="field">
            <span class="field-label">飞行高度（米）</span>
            <input v-model="form.altitude" class="input num" type="number" min="30" max="500" />
          </label>
        </div>

        <div class="form-section">
          <div class="form-section-head">
            <span class="form-section-title">飞行路径</span>
            <span class="muted">从真实路口里挑锚点，系统自动插值成平滑轨迹</span>
          </div>

          <div class="form-grid form-grid-3">
            <label class="field">
              <span class="field-label">起点 *</span>
              <select v-model="form.start" class="select">
                <option value="">请选择</option>
                <option v-for="item in landmarkOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </option>
              </select>
              <span v-if="errors.start" class="form-error">{{ errors.start }}</span>
            </label>

            <label class="field">
              <span class="field-label">途经点（可选，最多 {{ ROUTE_MAX_WAYPOINTS }} 个）</span>
              <div class="waypoint-list">
                <div v-for="(_, index) in form.waypoints" :key="index" class="waypoint-row">
                  <select v-model="form.waypoints[index]" class="select">
                    <option value="">不经过</option>
                    <option v-for="item in landmarkOptions" :key="item.value" :value="item.value">
                      {{ item.label }}
                    </option>
                  </select>
                  <button
                    class="btn btn-xs btn-icon"
                    type="button"
                    aria-label="移除途经点"
                    @click="removeWaypoint(index)"
                  >
                    ×
                  </button>
                </div>
                <button
                  v-if="form.waypoints.length < ROUTE_MAX_WAYPOINTS"
                  class="btn btn-xs add-waypoint"
                  type="button"
                  @click="addWaypoint"
                >
                  + 添加途经点
                </button>
              </div>
              <span v-if="errors.waypoints" class="form-error">{{ errors.waypoints }}</span>
            </label>

            <label class="field">
              <span class="field-label">终点 *</span>
              <select v-model="form.end" class="select">
                <option value="">请选择</option>
                <option v-for="item in landmarkOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </option>
              </select>
              <span v-if="errors.end" class="form-error">{{ errors.end }}</span>
            </label>
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-head">
            <span class="form-section-title">自动测算</span>
            <span class="muted">按巡航 {{ ROUTE_CRUISE_SPEED_KMH }} km/h 估算，不需要手填</span>
          </div>

          <div class="derive">
            <div class="derive-item">
              <span class="derive-key">锚点数</span>
              <span class="derive-val num">{{ formAnchors.length }}</span>
            </div>
            <div class="derive-item">
              <span class="derive-key">轨迹里程</span>
              <span class="derive-val num">
                {{ formPath ? `${toFixed(formPath.distanceKm, 1)} km` : '—' }}
              </span>
            </div>
            <div class="derive-item">
              <span class="derive-key">预计时长</span>
              <span class="derive-val num">{{ formDuration ? `${formDuration} min` : '—' }}</span>
            </div>
            <div class="derive-item">
              <span class="derive-key">轨迹点数</span>
              <span class="derive-val num">{{ formPath ? formPath.path.length : 0 }}</span>
            </div>
          </div>

          <div class="form-preview">
            <RoutePreviewMap :route="formPreviewRoute" />
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-head">
            <span class="form-section-title">避障与返航</span>
            <span class="muted">绕行段由锚点自动派生，改锚点会一起重算</span>
          </div>

          <div class="form-grid form-grid-3">
            <label class="field">
              <span class="field-label">避障策略</span>
              <select v-model="form.avoidStrategy" class="select">
                <option v-for="(label, value) in AVOID_STRATEGY_LABEL" :key="value" :value="value">
                  {{ label }}
                </option>
              </select>
            </label>

            <label class="field">
              <span class="field-label">障碍安全间距（米）</span>
              <input v-model="form.obstacleClearanceM" class="input num" type="number" min="10" max="80" />
            </label>

            <label class="field">
              <span class="field-label">最低安全高度（米）</span>
              <input v-model="form.minSafeAltitude" class="input num" type="number" min="30" max="120" />
            </label>

            <label class="field">
              <span class="field-label">最高安全高度（米）</span>
              <input v-model="form.maxSafeAltitude" class="input num" type="number" min="100" max="300" />
            </label>

            <label class="field">
              <span class="field-label">返航点</span>
              <select v-model="form.returnPointName" class="select">
                <option value="">默认取起点</option>
                <option v-for="item in landmarkOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </option>
              </select>
            </label>

            <label class="field">
              <span class="field-label">返航模式</span>
              <select v-model="form.returnMode" class="select">
                <option v-for="(label, value) in RETURN_MODE_LABEL" :key="value" :value="value">
                  {{ label }}
                </option>
              </select>
            </label>

            <label class="field">
              <span class="field-label">返航触发电量（%）</span>
              <input v-model="form.returnBatteryThreshold" class="input num" type="number" min="10" max="40" />
            </label>

            <label class="field">
              <span class="field-label">返航高度（米）</span>
              <input v-model="form.rtlAltitude" class="input num" type="number" min="60" max="300" />
            </label>
          </div>
        </div>

        <label class="field">
          <span class="field-label">备注</span>
          <input v-model="form.remark" class="input" type="text" placeholder="选填，如巡检重点、注意事项" />
        </label>
      </div>

      <template #footer>
        <button class="btn" type="button" @click="dialogOpen = false">取消</button>
        <button class="btn btn-primary" type="button" @click="submit">
          {{ editingId ? '保存修改' : '创建航线' }}
        </button>
      </template>
    </ModalDialog>

    <ModalDialog v-model="confirmOpen" title="删除航线" width="430px">
      <template v-if="pendingDelete">
        <p class="confirm-text">
          确认删除航线
          <strong>{{ pendingDelete.code }} {{ pendingDelete.name }}</strong>
          吗？
        </p>
        <p v-if="deleteBlocked" class="confirm-block">
          该航线已被任务 {{ pendingDelete.boundLabel }} 占用，需先解除绑定才能删除。
        </p>
        <p v-else class="muted confirm-note">删除后该航线的轨迹将从列表中移除，此操作不可撤销。</p>
      </template>

      <template #footer>
        <button class="btn" type="button" @click="confirmOpen = false">取消</button>
        <button class="btn btn-danger" type="button" :disabled="deleteBlocked" @click="confirmDelete">
          确认删除
        </button>
      </template>
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

/* ---- 工具栏 ---- */
.toolbar {
  display: flex;
  flex: none;
  align-items: flex-end;
  gap: 10px;
}

.toolbar-field {
  width: 148px;
}

.toolbar-field-wide {
  flex: 1;
  max-width: 320px;
}

.toolbar-reset {
  height: 28px;
}

/* ---- 内容区 ---- */
.content {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, 1fr) 400px;
  gap: var(--gap);
  min-height: 0;
}

.table-card {
  min-width: 0;
}

.row-actions {
  display: inline-flex;
  gap: 6px;
  justify-content: flex-end;
}

.danger-text:not(:disabled) {
  color: var(--danger);
  border-color: var(--danger-border, #e7c4c4);
}

.danger-text:not(:disabled):hover {
  color: #fff;
  background: var(--danger);
  border-color: var(--danger);
}

.avoid-cell {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.detour-mark {
  padding: 0 5px;
  font-size: 10px;
  color: #e07b39;
  background: rgba(224, 123, 57, 0.12);
  border-radius: var(--radius-sm);
}

/* ---- 绑定任务的跳转入口 ---- */
.link-cell {
  display: inline-flex;
  align-items: center;
  padding: 0;
  background: transparent;
  border: none;
}

.link-code {
  font-size: var(--fs-11);
  color: var(--accent);
}

.link-cell:hover .link-code {
  text-decoration: underline;
}

/* ---- 预览卡 ---- */
.preview-card {
  min-width: 0;
}

.preview-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

.preview-body :deep(.preview) {
  min-height: 220px;
}

.preview-meta {
  display: flex;
  flex: none;
  flex-direction: column;
  gap: 7px;
  margin: 0;
}

.preview-row {
  display: flex;
  gap: 10px;
  font-size: var(--fs-12);
}

.preview-row dt {
  flex: none;
  width: 62px;
  color: var(--text-muted);
}

.preview-row dd {
  flex: 1;
  min-width: 0;
  margin: 0;
  color: var(--text);
  word-break: break-all;
}

.preview-anchors {
  line-height: 1.5;
}

/* ---- 表单 ---- */
.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.form-grid-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.form-section-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.form-section-title {
  font-size: var(--fs-12);
  font-weight: 600;
}

.form-section-head .muted {
  font-size: var(--fs-11);
}

.form-error {
  font-size: var(--fs-11);
  color: var(--danger);
}

.waypoint-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.waypoint-row {
  display: flex;
  gap: 6px;
}

.add-waypoint {
  align-self: flex-start;
}

/* ---- 自动测算 ---- */
.derive {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.derive-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 7px 9px;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.derive-key {
  font-size: var(--fs-11);
  color: var(--text-muted);
}

.derive-val {
  font-size: var(--fs-13);
  font-weight: 500;
}

.form-preview {
  display: flex;
  height: 200px;
}

.form-preview :deep(.preview) {
  width: 100%;
}

/* ---- 删除确认 ---- */
.confirm-text {
  font-size: var(--fs-13);
  line-height: 1.7;
}

.confirm-block {
  margin-top: 8px;
  padding: 7px 9px;
  font-size: var(--fs-12);
  color: var(--warn);
  background: var(--warn-soft);
  border-radius: var(--radius-sm);
}

.confirm-note {
  margin-top: 8px;
  font-size: var(--fs-12);
}

@media (max-width: 1500px) {
  .content {
    grid-template-columns: minmax(0, 1fr) 340px;
  }
}
</style>

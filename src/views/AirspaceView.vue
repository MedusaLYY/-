<script setup>
/**
 * 空域管理页。
 *
 * 空域是「管制规则」不是「任务产物」，所以：
 *   · 增删改与航线规划同构（不可变替换、多边形是中心点+半径的派生值）
 *   · 但不参与监测总览的筛选管线——筛任务不该让禁飞区从地图上消失
 *
 * 写操作受角色权限控制（app.can('editAirspace')），只读访客看不到任何写按钮。
 */

import { computed, reactive, ref, watch } from 'vue'
import { useMonitorStore } from '../stores/monitor'
import { useAppStore } from '../stores/app'
import { DISTRICT_CENTERS, LANDMARKS } from '../mock'
import {
  AIRSPACE_CATEGORY,
  AIRSPACE_CATEGORY_COLOR,
  AIRSPACE_CATEGORY_LABEL,
  AIRSPACE_DEFAULT_RADIUS_KM,
  AIRSPACE_DEFAULT_SIDES,
  AIRSPACE_LEVEL,
  AIRSPACE_LEVEL_LABEL,
  AIRSPACE_LEVEL_TAG,
  AIRSPACE_STATUS,
  AIRSPACE_STATUS_LABEL,
  AIRSPACE_STATUS_TAG,
} from '../domain/constants'
import { buildAirspacePolygon } from '../utils/airspace'
import { dateTime } from '../utils/format'
import TopBar from '../components/layout/TopBar.vue'
import DataTable from '../components/common/DataTable.vue'
import ModalDialog from '../components/common/ModalDialog.vue'
import StatusTag from '../components/common/StatusTag.vue'
import AirspacePreviewMap from '../components/map/AirspacePreviewMap.vue'

const store = useMonitorStore()
const app = useAppStore()

const canEdit = computed(() => app.can('editAirspace'))

/* ---------------- 选项 ---------------- */

const LANDMARK_ENTRIES = Object.entries(LANDMARKS)

const categoryOptions = Object.entries(AIRSPACE_CATEGORY_LABEL).map(([value, label]) => ({
  value,
  label,
}))
const levelOptions = Object.entries(AIRSPACE_LEVEL_LABEL).map(([value, label]) => ({ value, label }))
const statusOptions = Object.entries(AIRSPACE_STATUS_LABEL).map(([value, label]) => ({ value, label }))
const districtOptions = Object.keys(DISTRICT_CENTERS).map((name) => ({ value: name, label: name }))
const landmarkOptions = LANDMARK_ENTRIES.map(([name]) => ({ value: name, label: name }))

/* ---------------- 行数据 ---------------- */

function landmarkNameOf(coord) {
  const hit = LANDMARK_ENTRIES.find(
    ([, c]) => Math.abs(c[0] - coord[0]) < 1e-6 && Math.abs(c[1] - coord[1]) < 1e-6
  )
  return hit ? hit[0] : '自定义点'
}

const rows = computed(() =>
  store.airspaces.map((item) => ({
    ...item,
    categoryLabel: AIRSPACE_CATEGORY_LABEL[item.category],
    levelLabel: AIRSPACE_LEVEL_LABEL[item.level],
    levelTone: (AIRSPACE_LEVEL_TAG[item.level] || 'tag-neutral').replace('tag-', ''),
    statusLabel: AIRSPACE_STATUS_LABEL[item.status],
    statusTone: (AIRSPACE_STATUS_TAG[item.status] || 'tag-neutral').replace('tag-', ''),
    centerName: landmarkNameOf(item.center),
    heightText:
      item.altitudeLimit === 0 ? '全高度禁飞' : `${item.altitudeFloor}~${item.altitudeLimit} m`,
    effectiveText: `${dateTime(item.effectiveFrom).slice(0, 10)} ~ ${dateTime(
      item.effectiveTo
    ).slice(0, 10)}`,
    coverage: store.airspaceTaskCoverage.get(item.id) || 0,
    anchorText: item.polygon.length + ' 个顶点',
  }))
)

const summaryCards = computed(() =>
  categoryOptions.map((option) => {
    const group = store.airspaceSummary.find((item) => item.category === option.value)
    return {
      key: option.value,
      label: option.label,
      color: AIRSPACE_CATEGORY_COLOR[option.value],
      count: group ? group.count : 0,
      active: group ? group.active : 0,
    }
  })
)

/* ---------------- 筛选 ---------------- */

const filters = reactive({ category: '', level: '', district: '', status: '', keyword: '' })

const activeFilterCount = computed(
  () =>
    [filters.category, filters.level, filters.district, filters.status, filters.keyword.trim()]
      .filter(Boolean).length
)

const filteredRows = computed(() => {
  let list = rows.value
  if (filters.category) list = list.filter((row) => row.category === filters.category)
  if (filters.level) list = list.filter((row) => row.level === filters.level)
  if (filters.district) list = list.filter((row) => row.district === filters.district)
  if (filters.status) list = list.filter((row) => row.status === filters.status)

  const keyword = filters.keyword.trim().toLowerCase()
  if (keyword) {
    list = list.filter((row) =>
      [row.code, row.name, row.district, row.owner, row.remark]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    )
  }
  return list
})

function resetFilters() {
  filters.category = ''
  filters.level = ''
  filters.district = ''
  filters.status = ''
  filters.keyword = ''
}

/* ---------------- 选中与预览 ---------------- */

const selectedId = ref(null)

const selectedAirspace = computed(
  () => rows.value.find((row) => row.id === selectedId.value) || null
)

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

function onRowClick(row) {
  selectedId.value = row.id
}

/* ---------------- 表单 ---------------- */

const dialogOpen = ref(false)
const editingId = ref(null)

const form = reactive({
  name: '',
  category: AIRSPACE_CATEGORY.NO_FLY,
  level: AIRSPACE_LEVEL.HIGH,
  district: '',
  centerName: '',
  radiusKm: AIRSPACE_DEFAULT_RADIUS_KM,
  sides: AIRSPACE_DEFAULT_SIDES,
  altitudeFloor: 0,
  altitudeLimit: 0,
  effectiveFrom: '2024-09-20T00:00',
  effectiveTo: '2024-12-31T23:59',
  status: AIRSPACE_STATUS.ACTIVE,
  owner: '上海市交通管理局',
  remark: '',
})

const errors = reactive({})

function clearErrors() {
  Object.keys(errors).forEach((key) => delete errors[key])
}

function resetForm() {
  form.name = ''
  form.category = AIRSPACE_CATEGORY.NO_FLY
  form.level = AIRSPACE_LEVEL.HIGH
  form.district = ''
  form.centerName = ''
  form.radiusKm = AIRSPACE_DEFAULT_RADIUS_KM
  form.sides = AIRSPACE_DEFAULT_SIDES
  form.altitudeFloor = 0
  form.altitudeLimit = 0
  form.effectiveFrom = '2024-09-20T00:00'
  form.effectiveTo = '2024-12-31T23:59'
  form.status = AIRSPACE_STATUS.ACTIVE
  form.owner = '上海市交通管理局'
  form.remark = ''
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
  form.name = row.name
  form.category = row.category
  form.level = row.level
  form.district = row.district
  form.centerName = landmarkNameOf(row.center)
  form.radiusKm = row.radiusKm
  form.sides = row.sides
  form.altitudeFloor = row.altitudeFloor
  form.altitudeLimit = row.altitudeLimit
  form.effectiveFrom = row.effectiveFrom.slice(0, 16)
  form.effectiveTo = row.effectiveTo.slice(0, 16)
  form.status = row.status
  form.owner = row.owner
  form.remark = row.remark
  dialogOpen.value = true
}

/** 表单里的即时预览，喂给预览地图 */
const formPreview = computed(() => {
  if (!form.centerName) return null
  const center = LANDMARKS[form.centerName]
  if (!center) return null

  return {
    id: 'preview',
    color: AIRSPACE_CATEGORY_COLOR[form.category],
    center,
    polygon: buildAirspacePolygon(
      center,
      Number(form.radiusKm) || AIRSPACE_DEFAULT_RADIUS_KM,
      Number(form.sides) || AIRSPACE_DEFAULT_SIDES,
      form.category
    ),
  }
})

const previewAirspace = computed(() => formPreview.value || selectedAirspace.value)

/* ---------------- 校验与提交 ---------------- */

function validate() {
  clearErrors()
  if (!form.name.trim()) errors.name = '请填写空域名称'
  if (!form.district) errors.district = '请选择所属区'
  if (!form.centerName) errors.centerName = '请选择中心点'
  if (!form.radiusKm || Number(form.radiusKm) <= 0) errors.radiusKm = '半径需大于 0'
  if (Number(form.altitudeLimit) < Number(form.altitudeFloor)) {
    errors.altitudeLimit = '高度上限不能低于下限'
  }
  if (form.effectiveFrom >= form.effectiveTo) errors.effectiveTo = '失效时间需晚于生效时间'
  return Object.keys(errors).length === 0
}

function submit() {
  if (!validate()) return

  const payload = {
    name: form.name.trim(),
    category: form.category,
    level: form.level,
    district: form.district,
    center: LANDMARKS[form.centerName],
    radiusKm: Number(form.radiusKm),
    sides: Number(form.sides),
    altitudeFloor: Number(form.altitudeFloor),
    altitudeLimit: Number(form.altitudeLimit),
    effectiveFrom: `${form.effectiveFrom}:00`,
    effectiveTo: `${form.effectiveTo}:00`,
    status: form.status,
    owner: form.owner.trim(),
    remark: form.remark.trim(),
  }

  if (editingId.value) {
    store.updateAirspace(editingId.value, payload)
  } else {
    const created = store.addAirspace(payload)
    selectedId.value = created.id
  }
  dialogOpen.value = false
}

/* ---------------- 删除 ---------------- */

const confirmOpen = ref(false)
const pendingDelete = ref(null)

function askDelete(row) {
  pendingDelete.value = row
  confirmOpen.value = true
}

function confirmDelete() {
  if (!pendingDelete.value) return
  store.removeAirspace(pendingDelete.value.id)
  if (selectedId.value === pendingDelete.value.id) selectedId.value = null
  confirmOpen.value = false
  pendingDelete.value = null
}

/* ---------------- 表格列 ---------------- */

const columns = [
  { key: 'code', label: '编号', width: '92px' },
  { key: 'name', label: '空域名称', width: '184px' },
  { key: 'categoryLabel', label: '类型', width: '96px' },
  { key: 'levelLabel', label: '管控等级', width: '100px' },
  { key: 'district', label: '所属区', width: '92px' },
  { key: 'centerName', label: '中心点', width: '108px' },
  { key: 'heightText', label: '高度区间', width: '112px' },
  { key: 'effectiveText', label: '生效期', width: '176px' },
  { key: 'statusLabel', label: '状态', width: '88px' },
  { key: 'coverage', label: '覆盖无人机', width: '104px', align: 'right' },
  { key: 'source', label: '来源', width: '80px' },
  { key: 'actions', label: '操作', width: '132px', align: 'right' },
]
</script>

<template>
  <div class="page">
    <TopBar />

    <div class="page-body">
      <header class="page-head">
        <div>
          <h1 class="page-title">空域管理</h1>
          <p class="page-sub">
            共 {{ rows.length }} 个空域 · 禁飞区 {{ summaryCards[0]?.count || 0 }} ·
            限飞区 {{ summaryCards[1]?.count || 0 }} · 电子围栏 {{ summaryCards[2]?.count || 0 }} ·
            航路走廊 {{ summaryCards[3]?.count || 0 }}
          </p>
        </div>
        <button v-if="canEdit" class="btn btn-primary" type="button" @click="openCreate">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M6 2v8M2 6h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>
          新建空域
        </button>
        <span v-else class="readonly-hint">
          <StatusTag :text="`${app.roleLabel} · 只读`" tone="neutral" />
        </span>
      </header>

      <div class="summary-grid">
        <article v-for="card in summaryCards" :key="card.key" class="summary-card">
          <span class="summary-mark" :style="{ background: card.color }" />
          <span class="summary-label">{{ card.label }}</span>
          <span class="summary-value num">
            {{ card.count }}
            <em>个</em>
          </span>
          <span class="summary-foot muted">生效中 {{ card.active }} 个</span>
        </article>
      </div>

      <div class="toolbar">
        <label class="field toolbar-field">
          <span class="field-label">类型</span>
          <select v-model="filters.category" class="select">
            <option value="">全部类型</option>
            <option v-for="item in categoryOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>

        <label class="field toolbar-field">
          <span class="field-label">管控等级</span>
          <select v-model="filters.level" class="select">
            <option value="">全部等级</option>
            <option v-for="item in levelOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>

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
          <span class="field-label">状态</span>
          <select v-model="filters.status" class="select">
            <option value="">全部状态</option>
            <option v-for="item in statusOptions" :key="item.value" :value="item.value">
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
            placeholder="编号 / 名称 / 管理单位"
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
            <h2 class="card-title">空域清单</h2>
            <div class="card-head-spacer" />
            <span class="muted num">{{ filteredRows.length }} / {{ rows.length }} 个</span>
          </div>

          <DataTable
            :columns="columns"
            :rows="filteredRows"
            :active-key="selectedId"
            min-width="1360px"
            clickable
            empty-text="没有匹配的空域，试试重置筛选"
            @row-click="onRowClick"
          >
            <template #code="{ row }">
              <span class="num">{{ row.code }}</span>
            </template>

            <template #name="{ row }">
              <span :title="row.remark">{{ row.name }}</span>
            </template>

            <template #categoryLabel="{ row }">
              <span class="category-tag">
                <i class="dot" :style="{ color: row.color }" />
                {{ row.categoryLabel }}
              </span>
            </template>

            <template #levelLabel="{ row }">
              <StatusTag :text="row.levelLabel" :tone="row.levelTone" />
            </template>

            <template #statusLabel="{ row }">
              <StatusTag :text="row.statusLabel" :tone="row.statusTone" />
            </template>

            <template #coverage="{ row }">
              <span class="num">{{ row.coverage }} 架</span>
            </template>

            <template #source="{ row }">
              <span class="tag" :class="row.isCustom ? 'tag-warn' : 'tag-neutral'">
                {{ row.isCustom ? '自定义' : '内置' }}
              </span>
            </template>

            <template #actions="{ row }">
              <span class="row-actions">
                <template v-if="canEdit">
                  <button class="btn btn-xs" type="button" @click.stop="openEdit(row)">编辑</button>
                  <button
                    class="btn btn-xs danger-text"
                    type="button"
                    title="删除该空域"
                    @click.stop="askDelete(row)"
                  >
                    删除
                  </button>
                </template>
                <span v-else class="muted">—</span>
              </span>
            </template>
          </DataTable>
        </section>

        <aside class="card preview-card">
          <div class="card-head">
            <h2 class="card-title">范围预览</h2>
            <div class="card-head-spacer" />
            <span v-if="selectedAirspace" class="muted num">{{ selectedAirspace.code }}</span>
          </div>

          <div class="card-body preview-body">
            <AirspacePreviewMap :airspace="previewAirspace" />

            <dl v-if="selectedAirspace" class="preview-meta">
              <div class="preview-row">
                <dt>空域名称</dt>
                <dd>{{ selectedAirspace.name }}</dd>
              </div>
              <div class="preview-row">
                <dt>类型 / 等级</dt>
                <dd>
                  {{ selectedAirspace.categoryLabel }} · {{ selectedAirspace.levelLabel }}
                </dd>
              </div>
              <div class="preview-row">
                <dt>中心 / 顶点</dt>
                <dd class="num">
                  {{ selectedAirspace.centerName }} · {{ selectedAirspace.anchorText }}
                </dd>
              </div>
              <div class="preview-row">
                <dt>高度区间</dt>
                <dd class="num">{{ selectedAirspace.heightText }}</dd>
              </div>
              <div class="preview-row">
                <dt>生效期</dt>
                <dd class="num">{{ selectedAirspace.effectiveText }}</dd>
              </div>
              <div class="preview-row">
                <dt>管理单位</dt>
                <dd>{{ selectedAirspace.owner }}</dd>
              </div>
              <div class="preview-row">
                <dt>覆盖无人机</dt>
                <dd class="num">{{ selectedAirspace.coverage }} 架（执行中）</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>

    <ModalDialog v-model="dialogOpen" :title="editingId ? '编辑空域' : '新建空域'" width="680px">
      <div class="form">
        <div class="form-grid">
          <label class="field">
            <span class="field-label">空域名称 *</span>
            <input v-model="form.name" class="input" type="text" placeholder="如：陆家嘴核心禁飞区" />
            <span v-if="errors.name" class="form-error">{{ errors.name }}</span>
          </label>

          <label class="field">
            <span class="field-label">类型 *</span>
            <select v-model="form.category" class="select">
              <option v-for="item in categoryOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </select>
          </label>

          <label class="field">
            <span class="field-label">管控等级 *</span>
            <select v-model="form.level" class="select">
              <option v-for="item in levelOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </select>
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
        </div>

        <div class="form-section">
          <div class="form-section-head">
            <span class="form-section-title">空间范围</span>
            <span class="muted">中心点 + 半径自动生成多边形，不用手写坐标</span>
          </div>

          <div class="form-grid form-grid-3">
            <label class="field">
              <span class="field-label">中心点 *</span>
              <select v-model="form.centerName" class="select">
                <option value="">请选择</option>
                <option v-for="item in landmarkOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </option>
              </select>
              <span v-if="errors.centerName" class="form-error">{{ errors.centerName }}</span>
            </label>

            <label class="field">
              <span class="field-label">半径（公里）*</span>
              <input v-model="form.radiusKm" class="input num" type="number" min="0.5" max="20" step="0.5" />
              <span v-if="errors.radiusKm" class="form-error">{{ errors.radiusKm }}</span>
            </label>

            <label class="field">
              <span class="field-label">多边形边数</span>
              <input v-model="form.sides" class="input num" type="number" min="3" max="8" />
            </label>

            <label class="field">
              <span class="field-label">高度下限（米）</span>
              <input v-model="form.altitudeFloor" class="input num" type="number" min="0" max="500" />
            </label>

            <label class="field">
              <span class="field-label">高度上限（米）</span>
              <input v-model="form.altitudeLimit" class="input num" type="number" min="0" max="500" />
              <span v-if="errors.altitudeLimit" class="form-error">{{ errors.altitudeLimit }}</span>
            </label>

            <label class="field">
              <span class="field-label">状态</span>
              <select v-model="form.status" class="select">
                <option v-for="item in statusOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </option>
              </select>
            </label>
          </div>

          <p class="form-note">
            高度上限填 0 表示全高度禁飞（禁飞区）。航路走廊按长条形生成，半径作为东西向半宽。
          </p>

          <div class="form-preview">
            <AirspacePreviewMap :airspace="formPreview" />
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-head">
            <span class="form-section-title">生效与归属</span>
          </div>

          <div class="form-grid">
            <label class="field">
              <span class="field-label">生效时间</span>
              <input v-model="form.effectiveFrom" class="input" type="datetime-local" />
            </label>

            <label class="field">
              <span class="field-label">失效时间</span>
              <input v-model="form.effectiveTo" class="input" type="datetime-local" />
              <span v-if="errors.effectiveTo" class="form-error">{{ errors.effectiveTo }}</span>
            </label>

            <label class="field">
              <span class="field-label">管理单位</span>
              <input v-model="form.owner" class="input" type="text" />
            </label>

            <label class="field">
              <span class="field-label">备注</span>
              <input v-model="form.remark" class="input" type="text" placeholder="管制说明、报批要求等" />
            </label>
          </div>
        </div>
      </div>

      <template #footer>
        <button class="btn" type="button" @click="dialogOpen = false">取消</button>
        <button class="btn btn-primary" type="button" @click="submit">
          {{ editingId ? '保存修改' : '创建空域' }}
        </button>
      </template>
    </ModalDialog>

    <ModalDialog v-model="confirmOpen" title="删除空域" width="430px">
      <p v-if="pendingDelete" class="confirm-text">
        确认删除空域 <strong>{{ pendingDelete.code }} {{ pendingDelete.name }}</strong> 吗？
      </p>
      <p class="muted confirm-note">
        删除后该空域的多边形将从清单与监测总览地图上移除，此操作不可撤销。
      </p>

      <template #footer>
        <button class="btn" type="button" @click="confirmOpen = false">取消</button>
        <button class="btn btn-danger" type="button" @click="confirmDelete">确认删除</button>
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

.readonly-hint {
  flex: none;
}

/* ---- 类型统计卡 ---- */
.summary-grid {
  display: grid;
  flex: none;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--gap);
}

.summary-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 11px 13px 11px 17px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
}

.summary-mark {
  position: absolute;
  top: 11px;
  bottom: 11px;
  left: 0;
  width: 3px;
  border-radius: 0 2px 2px 0;
}

.summary-label {
  font-size: var(--fs-12);
  color: var(--text-secondary);
}

.summary-value {
  font-size: var(--fs-22, 22px);
  font-weight: 600;
  line-height: 1.15;
}

.summary-value em {
  font-size: var(--fs-12);
  font-style: normal;
  font-weight: 400;
  color: var(--text-muted);
}

.summary-foot {
  font-size: var(--fs-11);
}

/* ---- 工具栏 ---- */
.toolbar {
  display: flex;
  flex: none;
  align-items: flex-end;
  gap: 10px;
}

.toolbar-field {
  width: 132px;
}

.toolbar-field-wide {
  flex: 1;
  max-width: 260px;
}

.toolbar-reset {
  height: 28px;
}

/* ---- 内容区 ---- */
.content {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, 1fr) 380px;
  gap: var(--gap);
  min-height: 0;
}

.table-card {
  min-width: 0;
}

.category-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.row-actions {
  display: inline-flex;
  gap: 6px;
  justify-content: flex-end;
}

.danger-text:not(:disabled) {
  color: var(--danger);
  border-color: #e7c4c4;
}

.danger-text:not(:disabled):hover {
  color: #fff;
  background: var(--danger);
  border-color: var(--danger);
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
  min-height: 200px;
}

.preview-meta {
  display: flex;
  flex: none;
  flex-direction: column;
  gap: 6px;
  margin: 0;
}

.preview-row {
  display: flex;
  gap: 10px;
  font-size: var(--fs-12);
}

.preview-row dt {
  flex: none;
  width: 66px;
  color: var(--text-muted);
}

.preview-row dd {
  flex: 1;
  min-width: 0;
  margin: 0;
  color: var(--text);
  word-break: break-all;
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

.form-note {
  font-size: var(--fs-11);
  line-height: 1.6;
  color: var(--text-muted);
}

.form-error {
  font-size: var(--fs-11);
  color: var(--danger);
}

.form-preview {
  display: flex;
  height: 190px;
}

.form-preview :deep(.preview) {
  width: 100%;
}

/* ---- 删除确认 ---- */
.confirm-text {
  font-size: var(--fs-13);
  line-height: 1.7;
}

.confirm-note {
  margin-top: 8px;
  font-size: var(--fs-12);
}

@media (max-width: 1500px) {
  .content {
    grid-template-columns: minmax(0, 1fr) 330px;
  }
}
</style>

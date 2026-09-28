<script setup>
/**
 * 数据管理页。
 *
 * 数据资产由飞行任务派生（见 mock/taskData.js）：每个任务产出影像 / 视频 / 取证 / 日志四类条目，
 * 所以这一页的每行都能一路回溯到「哪架无人机、执行哪条任务、什么时候采的」。
 *
 * 本页只读。真实系统里这里还会有上传、下载、归档、清理等写操作，
 * 纯前端演示不做假动作，只提供筛选与追溯。
 */

import { computed, reactive, ref } from 'vue'
import { useMonitorStore } from '../stores/monitor'
import { useAppStore } from '../stores/app'
import { ASSET_SUMMARY } from '../mock'
import {
  ACCESS_LEVEL_LABEL,
  ACCESS_LEVEL_RANK,
  ACCESS_LEVEL_TAG,
  LINK_QUALITY_LABEL,
  STORAGE_TIER_LABEL,
  TRANSMISSION_STATUS_LABEL,
  TRANSMISSION_STATUS_TAG,
} from '../domain/constants'
import { toFixed, fileSize, dateTime } from '../utils/format'
import { exportCsv, datedFileName } from '../utils/csv'
import TopBar from '../components/layout/TopBar.vue'
import DataTable from '../components/common/DataTable.vue'
import ModalDialog from '../components/common/ModalDialog.vue'
import StatusTag from '../components/common/StatusTag.vue'

const store = useMonitorStore()
const app = useAppStore()

/* ---------------- 选项 ---------------- */

const categoryOptions = [
  { value: '', label: '全部类别' },
  ...ASSET_SUMMARY.map((item) => ({ value: item.key, label: item.label })),
]

const transmissionOptions = [
  { value: '', label: '全部回传状态' },
  ...Object.entries(TRANSMISSION_STATUS_LABEL).map(([value, label]) => ({ value, label })),
]

const tierOptions = [
  { value: '', label: '全部存储分层' },
  ...Object.entries(STORAGE_TIER_LABEL).map(([value, label]) => ({ value, label })),
]

const accessOptions = [
  { value: '', label: '全部密级' },
  ...Object.entries(ACCESS_LEVEL_LABEL).map(([value, label]) => ({ value, label })),
]

const storageOptions = computed(() => [
  { value: '', label: '全部位置' },
  ...[...new Set(store.dataAssets.map((asset) => asset.storage))].map((name) => ({
    value: name,
    label: name,
  })),
])

const taskOptions = computed(() => [
  { value: '', label: '全部任务' },
  ...store.tasks.map((task) => ({ value: task.id, label: `${task.code} ${task.name}` })),
])

/* ---------------- 汇总 ---------------- */

const totalSizeMb = computed(() =>
  ASSET_SUMMARY.reduce((sum, item) => sum + item.sizeMb, 0)
)

/* ---------------- 行数据 ---------------- */

/**
 * 当前角色可见的数据资产（按密级过滤）。
 *
 * 权限**只作用于本页**，不进入 monitor store 的筛选管线 ——
 * 否则同一个任务会在监测总览可见、在数据管理页不可见，两个视图的计数也会对不上。
 */
const visibleRows = computed(() =>
  store.dataAssets.filter((asset) => ACCESS_LEVEL_RANK[asset.accessLevel] <= app.maxAccessRank)
)

const rows = computed(() =>
  visibleRows.value.map((asset) => {
    const drone = store.droneById(asset.droneId)
    return {
      ...asset,
      sizeText: fileSize(asset.sizeMb),
      createdText: dateTime(asset.createdAt),
      expireText: dateTime(asset.expireAt).slice(0, 10),
      droneStatus: drone ? drone.status : 'offline',
      transmissionLabel: TRANSMISSION_STATUS_LABEL[asset.transmission],
      transmissionTone: (TRANSMISSION_STATUS_TAG[asset.transmission] || 'tag-neutral').replace(
        'tag-',
        ''
      ),
      tierLabel: STORAGE_TIER_LABEL[asset.storageTier],
      accessLabel: ACCESS_LEVEL_LABEL[asset.accessLevel],
      accessTone: (ACCESS_LEVEL_TAG[asset.accessLevel] || 'tag-neutral').replace('tag-', ''),
      linkLabel: LINK_QUALITY_LABEL[asset.linkQuality],
      tagText: asset.tags.join(' / '),
    }
  })
)

/* ---------------- 筛选 ---------------- */

const filters = reactive({
  category: '',
  storage: '',
  taskId: '',
  transmission: '',
  tier: '',
  access: '',
  keyword: '',
})

const activeFilterCount = computed(
  () =>
    [
      filters.category,
      filters.storage,
      filters.taskId,
      filters.transmission,
      filters.tier,
      filters.access,
      filters.keyword.trim(),
    ].filter(Boolean).length
)

const filteredRows = computed(() => {
  let list = rows.value
  if (filters.category) list = list.filter((row) => row.category === filters.category)
  if (filters.storage) list = list.filter((row) => row.storage === filters.storage)
  if (filters.taskId) list = list.filter((row) => row.taskId === filters.taskId)
  if (filters.transmission) list = list.filter((row) => row.transmission === filters.transmission)
  if (filters.tier) list = list.filter((row) => row.storageTier === filters.tier)
  if (filters.access) list = list.filter((row) => row.accessLevel === filters.access)

  const keyword = filters.keyword.trim().toLowerCase()
  if (keyword) {
    list = list.filter((row) =>
      [
        row.id,
        row.taskCode,
        row.taskName,
        row.categoryLabel,
        row.droneId,
        row.storage,
        row.tagText,
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    )
  }
  return list
})

const filteredSizeMb = computed(() =>
  filteredRows.value.reduce((sum, row) => sum + row.sizeMb, 0)
)

function resetFilters() {
  filters.category = ''
  filters.storage = ''
  filters.taskId = ''
  filters.transmission = ''
  filters.tier = ''
  filters.access = ''
  filters.keyword = ''
}

/* ---------------- 导出 ---------------- */

const canExport = computed(() => app.can('exportData'))

/** 导出用的列定义。与表格列分开：导出要的是纯文本，不是渲染结果 */
const EXPORT_COLUMNS = [
  { label: '资产编号', value: (row) => row.id },
  { label: '资产类别', value: (row) => row.categoryLabel },
  { label: '关联任务编号', value: (row) => row.taskCode },
  { label: '关联任务名称', value: (row) => row.taskName },
  { label: '所属无人机', value: (row) => row.droneId },
  { label: '采集时间', value: (row) => row.createdText },
  { label: '回传状态', value: (row) => row.transmissionLabel },
  { label: '回传进度', value: (row) => `${row.progress}%` },
  { label: '链路质量', value: (row) => row.linkLabel },
  { label: '存储位置', value: (row) => row.storage },
  { label: '存储分层', value: (row) => row.tierLabel },
  { label: '访问密级', value: (row) => row.accessLabel },
  { label: '数量', value: (row) => `${toFixed(row.amount, 1)} ${row.unit}` },
  { label: '体积(MB)', value: (row) => row.sizeMb },
  { label: '保留至', value: (row) => row.expireText },
  { label: '标签', value: (row) => row.tagText },
  { label: '校验和', value: (row) => row.checksum },
]

function exportRows(list, prefix) {
  if (!list.length) return
  exportCsv(datedFileName(prefix), EXPORT_COLUMNS, list)
}

function exportAll() {
  exportRows(filteredRows.value, '数据资产清单')
}

function exportOne(row) {
  exportRows([row], `数据资产_${row.id}`)
}

/* ---------------- 详情 ---------------- */

const detailOpen = ref(false)
const detailId = ref(null)

const detailAsset = computed(
  () => filteredRows.value.find((row) => row.id === detailId.value) || null
)

/** 同任务下的其他资产，用于回答「这份数据是哪一趟飞行一起产出的」 */
const siblingAssets = computed(() =>
  detailAsset.value
    ? store.dataAssets.filter(
        (asset) => asset.taskId === detailAsset.value.taskId && asset.id !== detailAsset.value.id
      )
    : []
)

const detailTask = computed(() =>
  detailAsset.value ? store.taskById(detailAsset.value.taskId) : null
)

function openDetail(row) {
  detailId.value = row.id
  detailOpen.value = true
}

/* ---------------- 表格列 ---------------- */

const columns = [
  { key: 'id', label: '资产编号', width: '156px' },
  { key: 'categoryLabel', label: '资产类别', width: '104px' },
  { key: 'taskName', label: '关联任务', width: '196px' },
  { key: 'droneId', label: '所属无人机', width: '100px' },
  { key: 'createdText', label: '采集时间', width: '156px' },
  { key: 'transmissionLabel', label: '回传状态', width: '112px' },
  { key: 'tierLabel', label: '存储分层', width: '104px' },
  { key: 'accessLabel', label: '密级', width: '84px' },
  { key: 'amount', label: '数量', width: '100px', align: 'right' },
  { key: 'sizeText', label: '体积', width: '92px', align: 'right' },
  { key: 'actions', label: '操作', width: '124px', align: 'right' },
]
</script>

<template>
  <div class="page">
    <TopBar />

    <div class="page-body">
      <header class="page-head">
        <div>
          <h1 class="page-title">数据管理</h1>
          <p class="page-sub">
            当前角色（{{ app.roleLabel }}）可见 {{ visibleRows.length }} / 共
            {{ store.dataAssets.length }} 条 · 合计 {{ fileSize(totalSizeMb) }} ·
            由 {{ store.tasks.length }} 条飞行任务产出
          </p>
        </div>

        <div class="head-actions">
          <StatusTag
            :text="`最高可见密级 ${ACCESS_LEVEL_LABEL[app.maxAccessLevel]}`"
            :tone="(ACCESS_LEVEL_TAG[app.maxAccessLevel] || 'tag-neutral').replace('tag-', '')"
          />
          <button
            class="btn btn-primary"
            type="button"
            :disabled="!canExport || !filteredRows.length"
            :title="canExport ? '导出当前筛选结果' : '当前角色无导出权限'"
            @click="exportAll"
          >
            导出 CSV（{{ filteredRows.length }}）
          </button>
        </div>
      </header>

      <div class="summary-grid">
        <article v-for="item in ASSET_SUMMARY" :key="item.key" class="summary-card">
          <span class="summary-label">{{ item.label }}</span>
          <span class="summary-value num">
            {{ toFixed(item.amount, 0) }}
            <em>{{ item.unit }}</em>
          </span>
          <span class="summary-foot">
            <span class="num">{{ fileSize(item.sizeMb) }}</span>
            <span class="muted">· {{ item.count }} 个任务有产出</span>
          </span>
        </article>
      </div>

      <div class="toolbar">
        <label class="field toolbar-field">
          <span class="field-label">资产类别</span>
          <select v-model="filters.category" class="select">
            <option v-for="item in categoryOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>

        <label class="field toolbar-field">
          <span class="field-label">存储位置</span>
          <select v-model="filters.storage" class="select">
            <option v-for="item in storageOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>

        <label class="field toolbar-field toolbar-field-task">
          <span class="field-label">关联任务</span>
          <select v-model="filters.taskId" class="select">
            <option v-for="item in taskOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>

        <label class="field toolbar-field">
          <span class="field-label">回传状态</span>
          <select v-model="filters.transmission" class="select">
            <option v-for="item in transmissionOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>

        <label class="field toolbar-field">
          <span class="field-label">存储分层</span>
          <select v-model="filters.tier" class="select">
            <option v-for="item in tierOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>

        <label class="field toolbar-field">
          <span class="field-label">访问密级</span>
          <select v-model="filters.access" class="select">
            <option v-for="item in accessOptions" :key="item.value" :value="item.value">
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
            placeholder="资产编号 / 任务编号 / 无人机编号"
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
          <h2 class="card-title">数据资产清单</h2>
          <div class="card-head-spacer" />
          <span class="muted num">
            {{ filteredRows.length }} / {{ store.dataAssets.length }} 条 · {{ fileSize(filteredSizeMb) }}
          </span>
        </div>

        <DataTable
          :columns="columns"
          :rows="filteredRows"
          min-width="1350px"
          clickable
          empty-text="没有匹配的数据资产，试试重置筛选"
          @row-click="openDetail"
        >
          <template #id="{ row }">
            <span class="num">{{ row.id }}</span>
          </template>

          <template #categoryLabel="{ row }">
            <span class="tag tag-info">{{ row.categoryLabel }}</span>
          </template>

          <template #taskName="{ row }">
            <span :title="`${row.taskCode} ${row.taskName}`">{{ row.taskCode }} · {{ row.taskName }}</span>
          </template>

          <template #droneId="{ row }">
            <span class="num">{{ row.droneId }}</span>
          </template>

          <template #createdText="{ row }">
            <span class="num">{{ row.createdText }}</span>
          </template>

          <template #transmissionLabel="{ row }">
            <span class="transmission-cell">
              <StatusTag :text="row.transmissionLabel" :tone="row.transmissionTone" />
              <span v-if="row.progress < 100" class="transmission-bar">
                <i :style="{ width: `${row.progress}%` }" />
              </span>
            </span>
          </template>

          <template #tierLabel="{ row }">
            <span :title="`保留至 ${row.expireText}（${row.retentionDays} 天）`">
              {{ row.tierLabel }}
            </span>
          </template>

          <template #accessLabel="{ row }">
            <StatusTag :text="row.accessLabel" :tone="row.accessTone" />
          </template>

          <template #status="{ row }">
            <StatusTag :text="row.status" tone="success" />
          </template>

          <template #amount="{ row }">
            <span class="num">{{ toFixed(row.amount, 1) }} {{ row.unit }}</span>
          </template>

          <template #sizeText="{ row }">
            <span class="num">{{ row.sizeText }}</span>
          </template>

          <template #actions="{ row }">
            <span class="row-actions">
              <button class="btn btn-xs" type="button" @click.stop="openDetail(row)">详情</button>
              <button
                class="btn btn-xs"
                type="button"
                :disabled="!canExport"
                :title="canExport ? '导出这一条' : '当前角色无导出权限'"
                @click.stop="exportOne(row)"
              >
                导出
              </button>
            </span>
          </template>
        </DataTable>
      </section>
    </div>

    <ModalDialog v-model="detailOpen" title="数据资产详情" width="580px">
      <div v-if="detailAsset" class="detail">
        <div class="detail-head">
          <div>
            <p class="detail-name">{{ detailAsset.categoryLabel }}</p>
            <p class="detail-code num">{{ detailAsset.id }}</p>
          </div>
          <StatusTag :text="detailAsset.status" tone="success" />
        </div>

        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-key">数据量</span>
            <span class="detail-val num">
              {{ toFixed(detailAsset.amount, 1) }} {{ detailAsset.unit }}
            </span>
          </div>
          <div class="detail-item">
            <span class="detail-key">存储体积</span>
            <span class="detail-val num">{{ detailAsset.sizeText }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-key">存储位置</span>
            <span class="detail-val">{{ detailAsset.storage }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-key">采集时间</span>
            <span class="detail-val num">{{ detailAsset.createdText }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-key">关联任务</span>
            <span class="detail-val num">{{ detailAsset.taskCode }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-key">采集无人机</span>
            <span class="detail-val num">{{ detailAsset.droneId }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-key">任务名称</span>
            <span class="detail-val" :title="detailAsset.taskName">{{ detailAsset.taskName }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-key">任务状态</span>
            <span class="detail-val">
              {{ detailTask ? detailTask.status : '—' }}
            </span>
          </div>
        </div>

        <div class="detail-block">
          <p class="detail-block-title">数据回传</p>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-key">回传状态</span>
              <span class="detail-val">
                <StatusTag
                  :text="detailAsset.transmissionLabel"
                  :tone="detailAsset.transmissionTone"
                />
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-key">回传进度</span>
              <span class="detail-val num">{{ detailAsset.progress }}%</span>
            </div>
            <div class="detail-item">
              <span class="detail-key">链路质量</span>
              <span class="detail-val">{{ detailAsset.linkLabel }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-key">回传带宽</span>
              <span class="detail-val num">{{ detailAsset.bandwidthMbps }} Mbps</span>
            </div>
            <div class="detail-item">
              <span class="detail-key">回传时间</span>
              <span class="detail-val num">
                {{ detailAsset.transmittedAt ? dateTime(detailAsset.transmittedAt) : '—' }}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-key">重试次数</span>
              <span class="detail-val num">{{ detailAsset.retryCount }}</span>
            </div>
          </div>
        </div>

        <div class="detail-block">
          <p class="detail-block-title">存储与权限</p>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-key">存储分层</span>
              <span class="detail-val">{{ detailAsset.tierLabel }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-key">保留天数</span>
              <span class="detail-val num">{{ detailAsset.retentionDays }} 天</span>
            </div>
            <div class="detail-item">
              <span class="detail-key">到期时间</span>
              <span class="detail-val num">{{ detailAsset.expireText }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-key">访问密级</span>
              <span class="detail-val">
                <StatusTag :text="detailAsset.accessLabel" :tone="detailAsset.accessTone" />
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-key">归属单位</span>
              <span class="detail-val" :title="detailAsset.ownerOrg">
                {{ detailAsset.ownerOrg }}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-key">数据校验和</span>
              <span class="detail-val num" :title="detailAsset.checksum">
                {{ detailAsset.checksum.slice(0, 20) }}…
              </span>
            </div>
          </div>

          <div class="tag-row">
            <span class="detail-key">检索标签</span>
            <span class="chip-list">
              <span v-for="tag in detailAsset.tags" :key="tag" class="tag tag-info">{{ tag }}</span>
            </span>
          </div>
        </div>

        <div class="detail-block">
          <p class="detail-block-title">同任务产出的其他资产（{{ siblingAssets.length }}）</p>
          <ul v-if="siblingAssets.length" class="sibling-list">
            <li v-for="asset in siblingAssets" :key="asset.id" class="sibling-row">
              <span class="sibling-name">{{ asset.categoryLabel }}</span>
              <span class="sibling-meta num">
                {{ toFixed(asset.amount, 1) }} {{ asset.unit }} · {{ fileSize(asset.sizeMb) }}
              </span>
            </li>
          </ul>
          <p v-else class="muted detail-none">该任务暂无其他数据资产</p>
        </div>

        <p class="detail-tip">
          提示：数据资产由飞行任务派生，因此这里的每一条都能回溯到具体的无人机与航线。
          在监测总览点选事件后，数据管理会只保留该事件关联任务产出的资产。
        </p>
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

/* ---- 汇总卡 ---- */
.summary-grid {
  display: grid;
  flex: none;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--gap);
}

.summary-card {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 11px 13px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
}

.summary-label {
  font-size: var(--fs-12);
  color: var(--text-secondary);
}

.summary-value {
  font-size: var(--fs-22, 22px);
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.015em;
}

.summary-value em {
  font-size: var(--fs-12);
  font-style: normal;
  font-weight: 400;
  color: var(--text-muted);
}

.summary-foot {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: var(--fs-11);
  color: var(--text-secondary);
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

.toolbar-field-task {
  width: 220px;
}

.toolbar-field-wide {
  flex: 1;
  max-width: 280px;
}

.toolbar-reset {
  height: 28px;
}

.table-card {
  flex: 1;
  min-height: 0;
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

.sibling-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sibling-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 9px;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.sibling-name {
  font-size: var(--fs-12);
  font-weight: 500;
}

.sibling-meta {
  font-size: var(--fs-11);
  color: var(--text-muted);
}

.detail-none {
  font-size: var(--fs-12);
}

.detail-tip {
  padding: 8px 10px;
  font-size: var(--fs-11);
  line-height: 1.65;
  color: var(--text-secondary);
  background: var(--surface-sunken);
  border-radius: var(--radius-sm);
}

/* ---- 页头操作 ---- */
.head-actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 10px;
}

/* ---- 回传状态列 ---- */
.transmission-cell {
  display: inline-flex;
  flex-direction: column;
  gap: 3px;
  width: 100%;
}

.transmission-bar {
  display: block;
  width: 100%;
  height: 3px;
  overflow: hidden;
  background: var(--border);
  border-radius: var(--radius-pill);
}

.transmission-bar i {
  display: block;
  height: 100%;
  background: var(--accent);
  border-radius: var(--radius-pill);
}

.row-actions {
  display: inline-flex;
  gap: 6px;
  justify-content: flex-end;
}

/* ---- 详情里的标签行 ---- */
.tag-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: var(--fs-12);
}

.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

@media (max-width: 1280px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

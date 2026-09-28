<script setup>
/**
 * OA 风格数据表格。
 *
 * 用法：columns 定义列，每个列 key 对应一个具名插槽，用于自定义单元格内容；
 * 没有对应插槽时按纯文本渲染 row[key]。
 */

const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, default: () => [] },
  rowKey: { type: String, default: 'id' },
  emptyText: { type: String, default: '暂无数据' },
  clickable: { type: Boolean, default: false },
  activeKey: { type: [String, Number], default: null },
  minWidth: { type: String, default: '1040px' },
})

const emit = defineEmits(['row-click'])

function onRowClick(row) {
  if (!props.clickable) return
  emit('row-click', row)
}
</script>

<template>
  <div class="table-wrap">
    <table class="table" :style="{ minWidth }">
      <colgroup>
        <col v-for="col in columns" :key="col.key" :style="{ width: col.width }" />
      </colgroup>
      <thead>
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            :style="{ textAlign: col.align || 'left' }"
          >
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="row[rowKey]"
          :class="{
            'is-clickable': clickable,
            'is-active': activeKey !== null && row[rowKey] === activeKey,
          }"
          @click="onRowClick(row)"
        >
          <td
            v-for="col in columns"
            :key="col.key"
            :style="{ textAlign: col.align || 'left' }"
          >
            <slot :name="col.key" :row="row" :value="row[col.key]">
              {{ row[col.key] === null || row[col.key] === undefined ? '—' : row[col.key] }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>

    <p v-if="!rows.length" class="empty">{{ emptyText }}</p>
  </div>
</template>

<style scoped>
.table-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--border-strong) transparent;
}

.table-wrap::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.table-wrap::-webkit-scrollbar-thumb {
  background: var(--border-strong);
  border-radius: var(--radius-pill);
}

.table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
}

.table th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 8px 10px;
  font-size: var(--fs-11);
  font-weight: 500;
  color: var(--text-muted);
  white-space: nowrap;
  background: var(--surface-sunken);
  border-bottom: 1px solid var(--border);
}

.table td {
  padding: 9px 10px;
  font-size: var(--fs-12);
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-bottom: 1px solid var(--border);
}

.table tbody tr:nth-child(even) {
  background: var(--surface-sunken);
}

.table tbody tr.is-clickable {
  cursor: pointer;
}

.table tbody tr:hover {
  background: var(--surface-hover);
}

.table tbody tr.is-active {
  background: var(--accent-soft);
}

.table tbody tr:last-child td {
  border-bottom: none;
}
</style>

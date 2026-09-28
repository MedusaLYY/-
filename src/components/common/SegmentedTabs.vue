<script setup>
defineProps({
  tabs: { type: Array, required: true },
  modelValue: { type: String, required: true },
  variant: { type: String, default: 'underline' },
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="tabs" :class="`tabs-${variant}`" role="tablist">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      class="tab"
      :class="{ 'is-active': tab.key === modelValue }"
      role="tab"
      :aria-selected="tab.key === modelValue"
      type="button"
      @click="emit('update:modelValue', tab.key)"
    >
      <span v-if="tab.icon" class="tab-icon" v-html="tab.icon" />
      <span>{{ tab.label }}</span>
      <span v-if="tab.count !== undefined" class="tab-count num">{{ tab.count }}</span>
    </button>
  </div>
</template>

<style scoped>
.tabs {
  display: flex;
  align-items: center;
  gap: 2px;
}

.tab {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 9px;
  font-size: var(--fs-12);
  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  transition: color 0.12s, background 0.12s;
}

.tab:hover {
  color: var(--text);
  background: var(--surface-hover);
}

.tab-icon {
  display: inline-flex;
  opacity: 0.85;
}

.tab-icon :deep(svg) {
  display: block;
}

.tab-count {
  padding: 0 4px;
  font-size: 10px;
  color: var(--text-muted);
  background: var(--neutral-soft);
  border-radius: var(--radius-pill);
}

/* 下划线式：用于卡片头部的主 Tab */
.tabs-underline {
  gap: 14px;
  height: 100%;
}

.tabs-underline .tab {
  position: relative;
  height: 100%;
  padding: 0;
  border-radius: 0;
}

.tabs-underline .tab:hover {
  background: transparent;
  color: var(--accent);
}

.tabs-underline .tab.is-active {
  color: var(--accent);
  font-weight: 500;
}

.tabs-underline .tab.is-active::after {
  content: "";
  position: absolute;
  right: 0;
  bottom: -1px;
  left: 0;
  height: 2px;
  background: var(--accent);
}

/* 分段式：用于卡片内部的次级切换 */
.tabs-segment {
  padding: 2px;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.tabs-segment .tab.is-active {
  color: var(--text);
  font-weight: 500;
  background: var(--surface);
  box-shadow: var(--shadow-card);
}
</style>

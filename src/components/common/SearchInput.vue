<script setup>
defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '请输入关键词' },
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="search-input">
    <input
      class="input input-search"
      type="search"
      :value="modelValue"
      :placeholder="placeholder"
      @input="emit('update:modelValue', $event.target.value)"
    />
    <button
      v-if="modelValue"
      class="search-clear"
      type="button"
      aria-label="清空搜索"
      @click="emit('update:modelValue', '')"
    >
      ×
    </button>
  </div>
</template>

<style scoped>
.search-input {
  position: relative;
  display: flex;
}

.search-clear {
  position: absolute;
  top: 50%;
  right: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-size: 13px;
  line-height: 1;
  color: var(--text-muted);
  background: transparent;
  border: none;
  border-radius: 50%;
  transform: translateY(-50%);
}

.search-clear:hover {
  color: var(--text);
  background: var(--surface-hover);
}
</style>

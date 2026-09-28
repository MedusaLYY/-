<script setup>
defineProps({
  modelValue: { type: String, default: '' },
  options: { type: Array, required: true },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '请选择' },
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <label class="filter-select">
    <span v-if="label" class="filter-label">{{ label }}</span>
    <select
      class="select"
      :value="modelValue"
      @change="emit('update:modelValue', $event.target.value)"
    >
      <option v-if="!options.length" value="">{{ placeholder }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
  </label>
</template>

<style scoped>
.filter-select {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.filter-label {
  font-size: var(--fs-11);
  color: var(--text-muted);
}
</style>

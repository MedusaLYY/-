<script setup>
defineProps({
  text: { type: String, required: true },
  tone: { type: String, default: 'neutral' },
  dot: { type: Boolean, default: false },
})
</script>

<template>
  <span class="tag" :class="`tag-${tone}`">
    <i v-if="dot" class="dot" />
    {{ text }}
  </span>
</template>

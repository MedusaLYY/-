<script setup>
/**
 * 模态弹窗：遮罩 + 标题栏 + 内容区 + 可选底部操作区。
 * 支持 ESC 关闭、点击遮罩关闭，打开期间锁定 body 滚动。
 */

import { onBeforeUnmount, onMounted, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  width: { type: String, default: '520px' },
  closeOnMask: { type: Boolean, default: true },
})

const emit = defineEmits(['update:modelValue'])

function close() {
  emit('update:modelValue', false)
}

function onMaskClick() {
  if (props.closeOnMask) close()
}

function onKeydown(event) {
  if (event.key === 'Escape' && props.modelValue) close()
}

watch(
  () => props.modelValue,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
  }
)

onMounted(() => window.addEventListener('keydown', onKeydown))

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="mask" @click.self="onMaskClick">
      <section class="dialog" :style="{ width }" role="dialog" aria-modal="true">
        <header class="dialog-head">
          <h3 class="dialog-title">{{ title }}</h3>
          <button class="dialog-close" type="button" aria-label="关闭" @click="close">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M2.5 2.5 9.5 9.5M9.5 2.5 2.5 9.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
            </svg>
          </button>
        </header>

        <div class="dialog-body scroll-y">
          <slot />
        </div>

        <footer v-if="$slots.footer" class="dialog-foot">
          <slot name="footer" />
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(28, 33, 40, 0.34);
}

.dialog {
  display: flex;
  flex-direction: column;
  max-width: 100%;
  max-height: 84vh;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-pop);
  overflow: hidden;
}

.dialog-head {
  display: flex;
  flex: none;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding: 0 14px;
  border-bottom: 1px solid var(--border);
}

.dialog-title {
  flex: 1;
  min-width: 0;
  font-size: var(--fs-13);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dialog-close {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: var(--text-muted);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
}

.dialog-close:hover {
  color: var(--text);
  background: var(--surface-hover);
}

.dialog-body {
  flex: 1;
  min-height: 0;
  padding: 14px;
}

.dialog-foot {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid var(--border);
}
</style>

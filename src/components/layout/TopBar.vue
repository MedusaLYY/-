<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '../../stores/app'
import { ROLE_DESC, ROLE_LABEL } from '../../domain/constants'

const app = useAppStore()
const route = useRoute()
const showNotifications = ref(false)
const showRoles = ref(false)

const currentPath = computed(() => route.path)

const roleOptions = Object.entries(ROLE_LABEL).map(([key, label]) => ({
  key,
  label,
  desc: ROLE_DESC[key],
}))

function pickRole(key) {
  app.setRole(key)
  showRoles.value = false
}
</script>

<template>
  <header class="topbar">
    <div class="brand">
      <span class="brand-mark" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 3.4 14.6 10 12 8.7 9.4 10Z" fill="var(--accent)" />
          <path d="M12 20.6 9.4 14 12 15.3 14.6 14Z" fill="var(--accent)" fill-opacity="0.45" />
          <circle cx="12" cy="12" r="2.2" fill="none" stroke="var(--accent)" stroke-width="1.6" />
          <path d="M4 8.6 8 11M20 8.6 16 11M4 15.4 8 13M20 15.4 16 13" stroke="var(--accent)" stroke-width="1.4" stroke-linecap="round" opacity="0.5" />
        </svg>
      </span>
      <span class="brand-name">低空交通监测系统</span>
    </div>

    <nav class="nav" aria-label="主导航">
      <router-link
        v-for="item in app.navItems"
        :key="item.key"
        class="nav-item"
        :class="{ 'is-active': currentPath === item.to }"
        :to="item.to"
      >
        {{ item.label }}
      </router-link>
    </nav>

    <div class="topbar-right">
      <div class="notify">
        <button
          class="notify-btn"
          type="button"
          aria-label="通知"
          @click="showNotifications = !showNotifications"
        >
          <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 2.6a4.6 4.6 0 0 0-4.6 4.6c0 4-1.5 5.2-1.5 5.2h12.2s-1.5-1.2-1.5-5.2A4.6 4.6 0 0 0 10 2.6Z"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linejoin="round"
            />
            <path d="M8.4 15.2a1.8 1.8 0 0 0 3.2 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
          </svg>
          <i v-if="app.unreadCount" class="notify-badge num">{{ app.unreadCount }}</i>
        </button>

        <div v-if="showNotifications" class="notify-panel">
          <div class="notify-head">
            <span>通知</span>
            <button class="link-more" type="button" @click="app.markAllRead()">全部已读</button>
          </div>
          <ul class="notify-list scroll-y">
            <li v-for="item in app.notifications" :key="item.id" class="notify-row">
              <i class="dot" :class="`tone-${item.level}`" />
              <div class="notify-body">
                <p class="notify-title" :class="{ 'is-read': item.read }">{{ item.title }}</p>
                <span class="notify-time num">{{ item.time }}</span>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <div class="user">
        <button
          class="user-btn"
          type="button"
          :title="`当前角色：${app.roleLabel}，点击切换`"
          @click="showRoles = !showRoles"
        >
          <span class="user-avatar" aria-hidden="true">{{ app.user.name.slice(0, 1) }}</span>
          <span class="user-meta">
            <span class="user-name">{{ app.user.name }}</span>
            <span class="user-org">{{ app.roleLabel }}</span>
          </span>
          <svg class="user-caret" width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path
              d="M1.5 3.5 5 7l3.5-3.5"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>

        <div v-if="showRoles" class="role-panel">
          <div class="role-head">切换角色 · 演示数据权限</div>
          <ul class="role-list">
            <li v-for="item in roleOptions" :key="item.key">
              <button
                class="role-item"
                :class="{ 'is-active': app.currentRole === item.key }"
                type="button"
                @click="pickRole(item.key)"
              >
                <span class="role-name">{{ item.label }}</span>
                <span class="role-desc">{{ item.desc }}</span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  flex: none;
  align-items: center;
  gap: 24px;
  height: var(--topbar-h);
  padding: 0 16px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand-mark {
  display: inline-flex;
  line-height: 0;
}

.brand-name {
  font-size: var(--fs-14);
  font-weight: 600;
  letter-spacing: 0.01em;
}

.nav {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 100%;
  /* 7 项导航在窄屏下横向滚动，而不是换行——换行会撑高顶栏，破坏三栏大屏布局 */
  overflow-x: auto;
  scrollbar-width: none;
}

.nav::-webkit-scrollbar {
  display: none;
}

.nav-item {
  position: relative;
  display: inline-flex;
  flex: none;
  align-items: center;
  height: 100%;
  padding: 0 9px;
  font-size: var(--fs-13);
  color: var(--text-secondary);
  white-space: nowrap;
}

.nav-item:hover {
  color: var(--text);
}

.nav-item.is-active {
  color: var(--accent);
  font-weight: 500;
}

.nav-item.is-active::after {
  content: "";
  position: absolute;
  right: 12px;
  bottom: -1px;
  left: 12px;
  height: 2px;
  background: var(--accent);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-left: auto;
}

/* ---- 通知 ---- */
.notify {
  position: relative;
}

.notify-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
}

.notify-btn:hover {
  color: var(--text);
  background: var(--surface-hover);
}

.notify-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  font-size: 9px;
  font-style: normal;
  line-height: 14px;
  color: #fff;
  text-align: center;
  background: var(--danger);
  border-radius: var(--radius-pill);
}

.notify-panel {
  position: absolute;
  top: 36px;
  right: 0;
  z-index: 900;
  width: 288px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-pop);
}

.notify-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 34px;
  padding: 0 10px;
  font-size: var(--fs-12);
  font-weight: 500;
  border-bottom: 1px solid var(--border);
}

.notify-list {
  max-height: 240px;
  padding: 4px;
}

.notify-row {
  display: flex;
  gap: 7px;
  padding: 7px 6px;
  border-radius: var(--radius-sm);
}

.notify-row:hover {
  background: var(--surface-hover);
}

.notify-row .dot {
  margin-top: 5px;
}

.tone-danger {
  color: var(--danger);
}

.tone-warn {
  color: var(--warn);
}

.tone-info {
  color: var(--info);
}

.notify-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.notify-title {
  font-size: var(--fs-12);
  line-height: 1.45;
}

.notify-title.is-read {
  color: var(--text-muted);
}

.notify-time {
  font-size: 10px;
  color: var(--text-muted);
}

/* ---- 用户 ---- */
.user {
  position: relative;
  display: flex;
  align-items: center;
  padding-left: 16px;
  border-left: 1px solid var(--border);
}

.user-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 6px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
}

.user-btn:hover {
  background: var(--surface-hover);
  border-color: var(--border);
}

.user-caret {
  flex: none;
  color: var(--text-muted);
}

/* ---- 角色切换面板 ---- */
.role-panel {
  position: absolute;
  top: 38px;
  right: 0;
  z-index: 900;
  width: 268px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-pop);
}

.role-head {
  padding: 9px 10px;
  font-size: var(--fs-12);
  font-weight: 500;
  border-bottom: 1px solid var(--border);
}

.role-list {
  padding: 4px;
}

.role-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: 7px 8px;
  text-align: left;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
}

.role-item:hover {
  background: var(--surface-hover);
}

.role-item.is-active {
  background: var(--accent-soft);
  border-color: var(--accent-border);
}

.role-name {
  font-size: var(--fs-12);
  font-weight: 500;
}

.role-desc {
  font-size: 10px;
  line-height: 1.5;
  color: var(--text-muted);
}

.user-avatar {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  font-size: var(--fs-12);
  font-weight: 600;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 50%;
}

.user-meta {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.user-name {
  font-size: var(--fs-12);
  font-weight: 500;
}

.user-org {
  font-size: 10px;
  color: var(--text-muted);
}
</style>

<script setup>
/**
 * 取证存证页。
 *
 * 核心是「哈希链」：每条取证记录都带 hash 与前序哈希 prevHash，
 * 首条的 prevHash 为 null（创世区块）。「一键校验」会真的逐环比对，
 * 不是永远返回通过——否则这个按钮就只是个装饰。
 *
 * 校验逻辑在 mock/evidence.js 的 verifyEvidenceChain()，页面只负责触发与展示。
 */

import { computed, ref } from 'vue'
import { useMonitorStore } from '../stores/monitor'
import { useAppStore } from '../stores/app'
import { EVIDENCE_CHAIN, VERIFY_STATUS, VERIFY_STATUS_LABEL, VERIFY_STATUS_TAG } from '../domain/constants'
import { dateTime, percent, toFixed } from '../utils/format'
import TopBar from '../components/layout/TopBar.vue'
import ModalDialog from '../components/common/ModalDialog.vue'
import StatusTag from '../components/common/StatusTag.vue'

const store = useMonitorStore()
const app = useAppStore()

const canVerify = computed(() => app.can('verifyEvidence'))

const verifyStatus = computed(() => store.evidenceVerify.status)

const verifyBanner = computed(() => {
  const state = store.evidenceVerify
  if (state.status === VERIFY_STATUS.RUNNING) {
    return { tone: 'info', title: '正在校验存证链…', note: `共 ${store.evidenceChain.length} 环，逐环比对前序哈希` }
  }
  if (state.status === VERIFY_STATUS.PASS) {
    return {
      tone: 'success',
      title: '存证链完整，未被篡改',
      note: `${state.total} 环全部通过 · 校验时间 ${dateTime(state.at)}`,
    }
  }
  if (state.status === VERIFY_STATUS.FAIL) {
    return {
      tone: 'danger',
      title: '存证链校验失败',
      note: `断点位于 ${state.brokenAt}，该记录的前序哈希与上一条不匹配`,
    }
  }
  return {
    tone: 'neutral',
    title: '尚未校验',
    note: '点击右侧「一键校验」逐环比对哈希链，验证取证数据是否完整未被篡改',
  }
})

/* ---------------- 统计 ---------------- */

const stats = computed(() => {
  const rows = store.evidenceChain
  const captured = rows.filter((row) => row.status === 'captured').length
  const avg =
    rows.length > 0 ? rows.reduce((sum, row) => sum + row.confidence, 0) / rows.length : 0
  return [
    { key: 'rings', label: '链上环数', value: String(rows.length), unit: '环' },
    { key: 'captured', label: '已取证', value: String(captured), unit: '条' },
    { key: 'confidence', label: '平均置信度', value: percent(avg), unit: '' },
    {
      key: 'height',
      label: '区块高度区间',
      value: rows.length ? `${rows[0].blockHeight} ~ ${rows[rows.length - 1].blockHeight}` : '—',
      unit: '',
    },
  ]
})

/* ---------------- 详情 ---------------- */

const detailOpen = ref(false)
const detailId = ref(null)

const detailRow = computed(
  () => store.evidenceChain.find((row) => row.id === detailId.value) || null
)

function openDetail(row) {
  detailId.value = row.id
  detailOpen.value = true
}

/** 短哈希显示：0x1234…abcd */
function shortHash(hash) {
  if (!hash) return EVIDENCE_CHAIN.GENESIS_LABEL
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`
}
</script>

<template>
  <div class="page">
    <TopBar />

    <div class="page-body">
      <header class="page-head">
        <div>
          <h1 class="page-title">取证存证</h1>
          <p class="page-sub">
            链标识 <span class="num">{{ EVIDENCE_CHAIN.CHAIN_ID }}</span> ·
            算法 {{ EVIDENCE_CHAIN.HASH_ALGO }} · 共 {{ store.evidenceChain.length }} 环 ·
            首环前序哈希为创世区块
          </p>
        </div>

        <div class="head-actions">
          <StatusTag
            :text="VERIFY_STATUS_LABEL[verifyStatus]"
            :tone="(VERIFY_STATUS_TAG[verifyStatus] || 'tag-neutral').replace('tag-', '')"
          />
          <button
            class="btn btn-primary"
            type="button"
            :disabled="!canVerify || verifyStatus === 'running'"
            :title="canVerify ? '逐环比对哈希链' : '当前角色无校验权限'"
            @click="store.verifyEvidence()"
          >
            {{ verifyStatus === 'running' ? '校验中…' : '一键校验' }}
          </button>
        </div>
      </header>

      <div class="verify-banner" :class="`tone-${verifyBanner.tone}`">
        <span class="banner-mark" />
        <div class="banner-body">
          <span class="banner-title">{{ verifyBanner.title }}</span>
          <span class="banner-note">{{ verifyBanner.note }}</span>
        </div>
      </div>

      <div class="stat-grid">
        <article v-for="item in stats" :key="item.key" class="stat-card">
          <span class="stat-label">{{ item.label }}</span>
          <span class="stat-value num">
            {{ item.value }}<em v-if="item.unit">{{ item.unit }}</em>
          </span>
        </article>
      </div>

      <section class="card chain-panel">
        <div class="card-head">
          <h2 class="card-title">存证链</h2>
          <div class="card-head-spacer" />
          <span class="muted">按区块高度升序 · 点任意一环查看完整哈希</span>
        </div>

        <div class="chain-body scroll-y">
          <ol class="chain-list">
            <li
              v-for="(row, index) in store.evidenceChain"
              :key="row.id"
              class="chain-item"
              :class="{ 'is-last': index === store.evidenceChain.length - 1 }"
            >
              <div class="chain-rail">
                <span class="chain-height num">{{ row.blockHeight }}</span>
                <i class="chain-node" :class="{ 'is-broken': row.verified === false && verifyStatus === 'fail' }" />
              </div>

              <button class="chain-card" type="button" @click="openDetail(row)">
                <div class="chain-head">
                  <span class="chain-code num">{{ row.code }}</span>
                  <span class="chain-event num">{{ row.eventCode }}</span>
                  <StatusTag
                    :text="row.type === 'video' ? '视频' : '图像'"
                    :tone="row.type === 'video' ? 'info' : 'neutral'"
                  />
                  <span class="chain-spacer" />
                  <span class="chain-conf num">置信度 {{ percent(row.confidence) }}</span>
                </div>

                <div class="chain-meta">
                  <span>{{ row.district }} {{ row.road }}</span>
                  <span class="num">{{ dateTime(row.capturedAt) }}</span>
                  <span class="num">{{ row.droneId }}</span>
                </div>

                <div class="chain-hash">
                  <span class="hash-row">
                    <span class="hash-key">本条哈希</span>
                    <code class="num">{{ shortHash(row.hash) }}</code>
                  </span>
                  <span class="hash-row">
                    <span class="hash-key">前序哈希</span>
                    <code class="num" :class="{ 'is-genesis': !row.prevHash }">
                      {{ shortHash(row.prevHash) }}
                    </code>
                  </span>
                </div>
              </button>
            </li>
          </ol>
        </div>
      </section>
    </div>

    <ModalDialog v-model="detailOpen" title="存证详情" width="620px">
      <div v-if="detailRow" class="detail">
        <div class="detail-head">
          <div>
            <p class="detail-name">{{ detailRow.label }}</p>
            <p class="detail-code num">
              {{ detailRow.code }} · {{ detailRow.eventCode }}
            </p>
          </div>
          <StatusTag
            :text="detailRow.status === 'captured' ? '已取证' : '待审核'"
            :tone="detailRow.status === 'captured' ? 'success' : 'warn'"
          />
        </div>

        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-key">区块高度</span>
            <span class="detail-val num">{{ detailRow.blockHeight }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-key">链标识</span>
            <span class="detail-val num">{{ detailRow.chainId }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-key">哈希算法</span>
            <span class="detail-val">{{ detailRow.hashAlgo }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-key">采集时间</span>
            <span class="detail-val num">{{ dateTime(detailRow.capturedAt) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-key">采集无人机</span>
            <span class="detail-val num">{{ detailRow.droneId }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-key">位置</span>
            <span class="detail-val">{{ detailRow.district }} {{ detailRow.road }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-key">置信度</span>
            <span class="detail-val num">{{ percent(detailRow.confidence) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-key">帧数 / 时长</span>
            <span class="detail-val num">
              {{ detailRow.frames }} 帧
              <template v-if="detailRow.durationSec"> · {{ detailRow.durationSec }} 秒</template>
            </span>
          </div>
          <div class="detail-item">
            <span class="detail-key">存储位置</span>
            <span class="detail-val">{{ detailRow.storage }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-key">存证状态</span>
            <span class="detail-val">{{ detailRow.chainStatus }}</span>
          </div>
        </div>

        <div class="hash-block">
          <div class="hash-line">
            <span class="hash-label">本条哈希</span>
            <code>{{ detailRow.hash }}</code>
          </div>
          <div class="hash-line">
            <span class="hash-label">前序哈希</span>
            <code :class="{ 'is-genesis': !detailRow.prevHash }">
              {{ detailRow.prevHash || `${EVIDENCE_CHAIN.GENESIS_LABEL}（链首）` }}
            </code>
          </div>
          <div class="hash-line">
            <span class="hash-label">批次根哈希</span>
            <code>{{ detailRow.merkleRoot }}</code>
          </div>
        </div>

        <p class="detail-tip">
          说明：这里的哈希由前端确定性生成，用于演示「证据链完整性校验」的交互。
          真实系统中哈希由存证服务在上链时写入，前端只做校验与展示。
        </p>
      </div>

      <template #footer>
        <button class="btn" type="button" @click="detailOpen = false">关闭</button>
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

.head-actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 10px;
}

/* ---- 校验结果横幅 ---- */
.verify-banner {
  display: flex;
  flex: none;
  align-items: center;
  gap: 10px;
  padding: 11px 13px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

.banner-mark {
  flex: none;
  width: 3px;
  align-self: stretch;
  border-radius: 2px;
  background: var(--text-muted);
}

.banner-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.banner-title {
  font-size: var(--fs-13);
  font-weight: 500;
}

.banner-note {
  font-size: var(--fs-11);
  color: var(--text-muted);
}

.tone-success {
  background: var(--success-soft);
  border-color: #bfe0cd;
}

.tone-success .banner-mark {
  background: var(--success);
}

.tone-success .banner-title {
  color: var(--success);
}

.tone-danger {
  background: var(--danger-soft);
  border-color: #e7c4c4;
}

.tone-danger .banner-mark {
  background: var(--danger);
}

.tone-danger .banner-title {
  color: var(--danger);
}

.tone-info {
  background: var(--info-soft);
  border-color: #c4d8f5;
}

.tone-info .banner-mark {
  background: var(--info);
}

.tone-info .banner-title {
  color: var(--info);
}

/* ---- 统计卡 ---- */
.stat-grid {
  display: grid;
  flex: none;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--gap);
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 11px 13px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
}

.stat-label {
  font-size: var(--fs-12);
  color: var(--text-secondary);
}

.stat-value {
  font-size: var(--fs-20, 20px);
  font-weight: 600;
  line-height: 1.2;
}

.stat-value em {
  margin-left: 3px;
  font-size: var(--fs-12);
  font-style: normal;
  font-weight: 400;
  color: var(--text-muted);
}

/* ---- 链 ---- */
.chain-panel {
  flex: 1;
  min-height: 0;
}

.chain-body {
  flex: 1;
  min-height: 0;
  padding: 12px 14px;
}

.chain-list {
  display: flex;
  flex-direction: column;
}

.chain-item {
  position: relative;
  display: flex;
  gap: 12px;
  padding-bottom: 10px;
}

.chain-item:not(.is-last)::before {
  content: "";
  position: absolute;
  top: 24px;
  bottom: 0;
  left: 19px;
  width: 2px;
  background: linear-gradient(to bottom, var(--accent-border), var(--accent-border));
}

.chain-rail {
  position: relative;
  z-index: 1;
  display: flex;
  flex: none;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  width: 40px;
}

.chain-height {
  font-size: 10px;
  color: var(--text-muted);
}

.chain-node {
  width: 10px;
  height: 10px;
  background: var(--accent);
  border: 2px solid var(--surface);
  border-radius: 50%;
  box-shadow: 0 0 0 1px var(--accent-border);
}

.chain-node.is-broken {
  background: var(--danger);
  box-shadow: 0 0 0 1px #e7c4c4;
}

.chain-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  padding: 10px 12px;
  text-align: left;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  transition: border-color 0.12s, box-shadow 0.12s;
}

.chain-card:hover {
  border-color: var(--accent-border);
  box-shadow: var(--shadow-card);
}

.chain-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chain-code {
  font-size: var(--fs-12);
  font-weight: 600;
}

.chain-event {
  font-size: var(--fs-11);
  color: var(--text-muted);
}

.chain-spacer {
  flex: 1;
}

.chain-conf {
  font-size: var(--fs-11);
  color: var(--text-secondary);
}

.chain-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: var(--fs-11);
  color: var(--text-muted);
}

.chain-hash {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.hash-row {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.hash-key {
  font-size: 10px;
  color: var(--text-muted);
}

.hash-row code {
  padding: 1px 6px;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 10px;
  color: var(--text-secondary);
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: 3px;
}

.hash-row code.is-genesis {
  color: var(--success);
  background: var(--success-soft);
  border-color: #bfe0cd;
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

.hash-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 11px;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.hash-line {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hash-label {
  font-size: var(--fs-11);
  color: var(--text-muted);
}

.hash-line code {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: var(--fs-11);
  line-height: 1.5;
  color: var(--text);
  word-break: break-all;
}

.hash-line code.is-genesis {
  color: var(--success);
}

.detail-tip {
  padding: 8px 10px;
  font-size: var(--fs-11);
  line-height: 1.65;
  color: var(--text-secondary);
  background: var(--surface-sunken);
  border-radius: var(--radius-sm);
}

@media (max-width: 1280px) {
  .stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

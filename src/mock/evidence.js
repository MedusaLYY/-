/** 交通违法取证记录。与告警事件一一对应，并按采集时间串成哈希链。 */

import { EVENTS } from './events'
import { fakeHash } from './hash'
import { EVIDENCE_CHAIN, EVIDENCE_STATUS } from '../domain/constants'

/**
 * 按采集时间升序排列。
 * 必须重排：EVENTS 的 time 是按「最新在前」写的（14:23 → 08:16），
 * 直接按原顺序串链会让区块高度与时间方向相反。
 */
const CHRONOLOGICAL = [...EVENTS].sort((a, b) => (a.time < b.time ? -1 : 1))

const CONFIDENCES = [0.94, 0.86, 0.78, 0.9, 0.82]

export const EVIDENCE = CHRONOLOGICAL.map((event, index) => {
  const isCaptured = event.status !== 'processing'
  // 用事件在原始 EVENTS 里的位置派生，保证这些值与排序无关
  const originalIndex = EVENTS.indexOf(event)

  const id = `EVIDENCE-${String(index + 1).padStart(2, '0')}`
  const hash = fakeHash(`${id}|${event.code}|${event.time}|${event.droneId}`)

  const prevEvent = index > 0 ? CHRONOLOGICAL[index - 1] : null
  const prevHash = prevEvent
    ? fakeHash(
        `EVIDENCE-${String(index).padStart(2, '0')}|${prevEvent.code}|${prevEvent.time}|${prevEvent.droneId}`
      )
    : EVIDENCE_CHAIN.GENESIS_PREV

  return {
    id,
    code: `EVD-${String(2401 + originalIndex)}`,
    eventId: event.id,
    eventCode: event.code,
    taskId: event.taskId,
    droneId: event.droneId,
    routeId: event.routeId,
    type: event.type === 'intrusion' ? 'video' : 'image',
    label: event.imageLabel,
    district: event.district,
    road: event.road,
    capturedAt: event.time,
    confidence: CONFIDENCES[originalIndex % CONFIDENCES.length],
    frames: event.type === 'intrusion' ? 1 : 3 + originalIndex,
    durationSec: event.type === 'intrusion' ? 46 : null,
    status: isCaptured ? EVIDENCE_STATUS.CAPTURED : EVIDENCE_STATUS.PENDING,
    storage: '取证存储池',
    // ---- 存证链 ----
    hash,
    prevHash,
    blockHeight: 1042 + index,
    chainId: EVIDENCE_CHAIN.CHAIN_ID,
    hashAlgo: EVIDENCE_CHAIN.HASH_ALGO,
    merkleRoot: fakeHash(`merkle|${id}`, 32),
    chainStatus: '已上链存证',
    verified: false,
    verifiedAt: null,
  }
})

/**
 * 逐环校验哈希链。
 *
 * 真实比对每条记录的 prevHash 与前一条的 hash，不是永远返回 true——
 * 否则「一键校验」就只是个装饰按钮。
 *
 * @returns {{ valid: boolean, total: number, brokenAt: string|null, checkedAt: string }}
 */
export function verifyEvidenceChain(rows) {
  const chain = [...rows].sort((a, b) => a.blockHeight - b.blockHeight)
  let brokenAt = null

  for (let i = 0; i < chain.length; i += 1) {
    const row = chain[i]
    const expectedPrev = i === 0 ? EVIDENCE_CHAIN.GENESIS_PREV : chain[i - 1].hash

    if (row.prevHash !== expectedPrev) {
      brokenAt = row.code
      break
    }
    if (i > 0 && row.blockHeight <= chain[i - 1].blockHeight) {
      brokenAt = row.code
      break
    }
  }

  return {
    valid: brokenAt === null,
    total: chain.length,
    brokenAt,
    checkedAt: new Date().toISOString(),
  }
}

export function evidenceByEventId(eventId) {
  return EVIDENCE.filter((row) => row.eventId === eventId)
}

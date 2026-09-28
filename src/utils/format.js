/** 通用格式化工具。 */

/** 保留 n 位小数，去掉多余的 0 */
export function toFixed(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const n = Number(value)
  return n.toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
}

/** 千分位 */
export function thousands(value) {
  if (value === null || value === undefined) return '—'
  return Number(value).toLocaleString('zh-CN')
}

/** 环比：0.12 -> "+12%" */
export function signedPercent(value) {
  if (value === null || value === undefined) return '—'
  const pct = Math.round(Number(value) * 100)
  return `${pct > 0 ? '+' : ''}${pct}%`
}

/** 置信度：0.92 -> "92%" */
export function percent(value, digits = 0) {
  if (value === null || value === undefined) return '—'
  return `${(Number(value) * 100).toFixed(digits)}%`
}

function pad(n) {
  return String(n).padStart(2, '0')
}

/** "2024-09-20T14:23:18" -> "2024-09-20 14:23:18" */
export function dateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}:${pad(d.getSeconds())}`
}

/** "2024-09-20T14:23:18" -> "14:23:18" */
export function clockTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** "2024-09-20T14:23:18" -> "09-20 14:23" */
export function shortDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 时长：分钟 -> "52.3 小时" / "48 分钟" */
export function duration(minutes) {
  if (minutes === null || minutes === undefined) return '—'
  const m = Number(minutes)
  if (m < 60) return `${toFixed(m, 0)} 分钟`
  return `${toFixed(m / 60, 1)} 小时`
}

/** 文件体积：MB -> "1.2 GB" / "340 MB" */
export function fileSize(mb) {
  if (mb === null || mb === undefined) return '—'
  const v = Number(mb)
  if (v < 1024) return `${toFixed(v, 0)} MB`
  return `${toFixed(v / 1024, 1)} GB`
}

/** 距离：km */
export function distance(km) {
  if (km === null || km === undefined) return '—'
  return `${toFixed(km, 1)} 公里`
}

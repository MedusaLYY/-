/**
 * CSV 导出（纯前端实现，不需要后端）。
 *
 * 三个必须做对的点：
 *   1. **UTF-8 BOM** —— 漏了的话 Excel 会把中文显示成乱码，这是最高频的坑
 *   2. **字段转义** —— 含逗号 / 引号 / 换行的字段必须用双引号包裹，内部引号写成两个
 *   3. **延迟释放 URL** —— 紧跟 click() 同步 revoke 会让部分浏览器下载中断
 */

function escapeCell(value) {
  if (value === null || value === undefined) return ''
  const text = String(value)
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

/**
 * 生成 CSV 文本（纯函数，不碰 DOM）。
 * 抽出来是为了能单独验证转义逻辑——真实数据里未必出现含逗号的字段，
 * 不能只靠「跑一遍没报错」来确认转义是对的。
 */
export function buildCsv(columns, rows) {
  const header = columns.map((column) => escapeCell(column.label)).join(',')
  const body = rows
    .map((row) => columns.map((column) => escapeCell(column.value(row))).join(','))
    .join('\r\n')
  return `${header}\r\n${body}`
}

/**
 * @param {string} filename 文件名，含 .csv 后缀
 * @param {Array<{ label: string, value: (row: any) => any }>} columns 列定义
 * @param {Array} rows 数据行
 */
export function exportCsv(filename, columns, rows) {
  const blob = new Blob([`\uFEFF${buildCsv(columns, rows)}`], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** 导出文件名统一带上日期，避免多次导出互相覆盖 */
export function datedFileName(prefix, ext = 'csv') {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${prefix}_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}.${ext}`
}

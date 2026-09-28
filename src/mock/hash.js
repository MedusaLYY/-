/**
 * 确定性伪哈希。
 *
 * 只用于演示「数据校验和 / 证据哈希」字段，**不是加密实现**——
 * 真实系统里这两处分别由数据网关与存证服务完成，前端只负责展示与校验。
 *
 * 必须是确定性的：同样的输入永远得到同样的输出，刷新页面不会变。
 */

/**
 * FNV-1a 混合 + xorshift 展开。
 *
 * 不能写成「边遍历边按块输出」：那样前 8 个字符相同的输入
 * （比如都以 'EVIDENCE-' 开头）会得到完全相同的结果。
 * 所以先把整个输入混成一个 32 位状态，再用 xorshift 展开成定长 hex。
 *
 * @param {string} input
 * @param {number} length 输出 hex 字符数（不含 0x 前缀）
 * @returns {string} 形如 0x1a2b3c...
 */
export function fakeHash(input, length = 64) {
  const text = String(input)
  let h = 2166136261

  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }

  let state = h || 1
  let out = ''

  while (out.length < length) {
    state ^= state << 13
    state >>>= 0
    state ^= state >>> 17
    state ^= state << 5
    state >>>= 0
    out += state.toString(16).padStart(8, '0')
  }

  return `0x${out.slice(0, length)}`
}

/**
 * 空域多边形生成（纯函数）。
 *
 * store 的 addAirspace / updateAirspace 与空域管理页的表单预览共用这一个函数，
 * 保证「表单里预览到的形状」与「保存后的形状」完全一致。
 * 分成两处实现的话，改了一处就会对不上。
 */

import { AIRSPACE_CATEGORY } from '../domain/constants'
import { blobPolygon, rectPolygon, createRandom } from '../mock/geometry'

/**
 * @param {[number, number]} center [lng, lat]
 * @param {number} radiusKm 半径（km）。走廊用它当东西向半宽
 * @param {number} sides 多边形边数
 * @param {string} category AIRSPACE_CATEGORY 之一
 * @param {number} seed 确定性种子，保证刷新后形状不变
 * @returns {Array<[number, number]>} 不闭合的多边形顶点，坐标保留 6 位小数
 */
export function buildAirspacePolygon(center, radiusKm, sides, category, seed = 20240404) {
  const polygon =
    category === AIRSPACE_CATEGORY.CORRIDOR
      ? rectPolygon(center, radiusKm, radiusKm * 5)
      : blobPolygon(center, radiusKm, sides, createRandom(seed))

  return polygon.map(([lng, lat]) => [Number(lng.toFixed(6)), Number(lat.toFixed(6))])
}

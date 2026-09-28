/**
 * 坐标系工具：WGS-84 ↔ GCJ-02。
 *
 * 背景：高德栅格瓦片使用 GCJ-02（火星坐标系），而多数公开 GeoJSON 为 WGS-84。
 * 两者在长三角地区存在约 500m 量级的整体偏移，直接叠加会导致区界与业务点位全部错位。
 * 本项目业务坐标统一按 GCJ-02 书写，与底图同源；GeoJSON 则依据 domain/constants.js
 * 的 GEO_SOURCE_CRS 决定是否需要转换。
 *
 * 实现为标准公开算法（零依赖），未引入 gcoord 等额外包。
 */

const PI = Math.PI
const AXIS = 6378245.0 // 克拉索夫斯基椭球长半轴
const ECC_SQ = 0.00669342162296594323 // 偏心率平方

/** 中国大陆粗略范围外不做偏移（港澳台及境外数据无需转换） */
function outOfChina(lng, lat) {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271
}

function transformLat(x, y) {
  let ret =
    -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  ret += ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(y * PI) + 40.0 * Math.sin((y / 3.0) * PI)) * 2.0) / 3.0
  ret += ((160.0 * Math.sin((y / 12.0) * PI) + 320 * Math.sin((y * PI) / 30.0)) * 2.0) / 3.0
  return ret
}

function transformLng(x, y) {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  ret += ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(x * PI) + 40.0 * Math.sin((x / 3.0) * PI)) * 2.0) / 3.0
  ret += ((150.0 * Math.sin((x / 12.0) * PI) + 300.0 * Math.sin((x / 30.0) * PI)) * 2.0) / 3.0
  return ret
}

/**
 * WGS-84 → GCJ-02
 * @param {number} lng
 * @param {number} lat
 * @returns {[number, number]} [lng, lat]
 */
export function wgs84ToGcj02(lng, lat) {
  if (outOfChina(lng, lat)) return [lng, lat]
  let dLat = transformLat(lng - 105.0, lat - 35.0)
  let dLng = transformLng(lng - 105.0, lat - 35.0)
  const radLat = (lat / 180.0) * PI
  let magic = Math.sin(radLat)
  magic = 1 - ECC_SQ * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  dLat = (dLat * 180.0) / (((AXIS * (1 - ECC_SQ)) / (magic * sqrtMagic)) * PI)
  dLng = (dLng * 180.0) / ((AXIS / sqrtMagic) * Math.cos(radLat) * PI)
  return [lng + dLng, lat + dLat]
}

/**
 * GCJ-02 → WGS-84（一次反向近似，米级误差，演示足够）
 * @param {number} lng
 * @param {number} lat
 * @returns {[number, number]} [lng, lat]
 */
export function gcj02ToWgs84(lng, lat) {
  if (outOfChina(lng, lat)) return [lng, lat]
  const [gLng, gLat] = wgs84ToGcj02(lng, lat)
  return [lng * 2 - gLng, lat * 2 - gLat]
}

const CONVERTERS = {
  'wgs84>gcj02': wgs84ToGcj02,
  'gcj02>wgs84': gcj02ToWgs84,
}

/**
 * 递归转换 GeoJSON 中所有坐标。
 * @param {object} geojson
 * @param {'wgs84'|'gcj02'} from
 * @param {'wgs84'|'gcj02'} to
 * @returns {object} 新的 GeoJSON（不修改入参）
 */
export function transformGeoJSON(geojson, from, to) {
  if (from === to) return geojson
  const convert = CONVERTERS[`${from}>${to}`]
  if (!convert) throw new Error(`不支持的坐标系转换：${from} -> ${to}`)

  const walk = (coords) => {
    if (typeof coords[0] === 'number') {
      const [lng, lat] = convert(coords[0], coords[1])
      return coords.length > 2 ? [lng, lat, ...coords.slice(2)] : [lng, lat]
    }
    return coords.map(walk)
  }

  return {
    ...geojson,
    features: geojson.features.map((feature) => ({
      ...feature,
      geometry: feature.geometry
        ? { ...feature.geometry, coordinates: walk(feature.geometry.coordinates) }
        : null,
    })),
  }
}

/**
 * 把业务坐标（按 GEO_SOURCE_CRS 书写）转成地图可用的 GCJ-02。
 * 业务坐标本身就是 GCJ-02 时为零开销直通。
 * @param {[number, number]} lngLat
 * @param {'wgs84'|'gcj02'} sourceCrs
 * @returns {[number, number]} [lng, lat] in GCJ-02
 */
export function toMapLngLat(lngLat, sourceCrs) {
  if (sourceCrs === 'gcj02') return lngLat
  return wgs84ToGcj02(lngLat[0], lngLat[1])
}

/** [lng, lat] → Leaflet 的 [lat, lng] */
export function toLeafletLatLng(lngLat) {
  return [lngLat[1], lngLat[0]]
}

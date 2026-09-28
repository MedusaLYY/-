/**
 * Leaflet 图标工厂。
 * 全部用内联 SVG + divIcon，避免引入图片资源，也便于按状态换色。
 */

import L from 'leaflet'

/** 无人机图标：机身用当前状态色，选中时加深并放大 */
export function droneIcon({ color = '#2f6feb', focused = false } = {}) {
  const size = focused ? 30 : 24
  const scale = focused ? 1 : 0.84
  const html = `
    <div class="map-drone ${focused ? 'is-focused' : ''}" style="--drone-color:${color}">
      <svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="15" fill="none" stroke="${color}" stroke-opacity="${focused ? 0.45 : 0.22}" stroke-width="1.5" transform="scale(${scale}) translate(${(1 - scale) * 16 / scale},${(1 - scale) * 16 / scale})"/>
        <path d="M16 5.5 20.2 15.4 16 13.6 11.8 15.4Z" fill="${color}"/>
        <path d="M16 26.5 11.8 16.6 16 18.4 20.2 16.6Z" fill="${color}" fill-opacity="0.45"/>
        <circle cx="16" cy="16" r="1.9" fill="#fff" stroke="${color}" stroke-width="1.4"/>
      </svg>
    </div>
  `
  return L.divIcon({
    className: 'map-drone-wrap',
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

/** 事件点位图标：菱形，按事件类型着色 */
export function eventIcon({ color = '#cc4b4b', focused = false } = {}) {
  const size = focused ? 20 : 16
  return L.divIcon({
    className: 'map-event-wrap',
    html: `
      <div class="map-event ${focused ? 'is-focused' : ''}">
        <svg width="${size}" height="${size}" viewBox="0 0 20 20">
          <path d="M10 1.6 18.4 10 10 18.4 1.6 10Z" fill="${color}" fill-opacity="${focused ? 0.95 : 0.7}" stroke="#fff" stroke-width="1.4"/>
        </svg>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

/** 返航点图标：圆形 + 内部回环箭头，表示「任务结束后回到这里」 */
export function returnPointIcon({ color = '#2f6feb', focused = false } = {}) {
  const size = focused ? 20 : 16
  return L.divIcon({
    className: 'map-return-wrap',
    html: `
      <div class="map-return ${focused ? 'is-focused' : ''}">
        <svg width="${size}" height="${size}" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="8.6" fill="#fff" stroke="${color}" stroke-width="1.6"/>
          <path d="M6.6 10a3.4 3.4 0 1 1 1.1 2.5" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M6.4 8.2v2.2h2.2" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

/** 行政区名称标注 */
export function districtLabelIcon(name) {
  return L.divIcon({
    className: 'map-district-label-wrap',
    html: `<span class="map-district-label">${name}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })
}

/** 地标（机场）标注 */
export function placeLabelIcon(name) {
  return L.divIcon({
    className: 'map-place-label-wrap',
    html: `<span class="map-place-label">${name}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })
}

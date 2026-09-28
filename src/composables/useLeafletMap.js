/**
 * Leaflet 实例封装。
 *
 * 三个关键约束（都是踩过的坑）：
 * 1. map 实例必须放在 shallowRef 里——放进 reactive / 深层 ref 会被 Proxy 包裹，Leaflet 内部状态会出问题。
 * 2. 只初始化一次，onBeforeUnmount 必须 map.remove()，否则 hash 路由来回切会报
 *    "Map container is already initialized"。
 * 3. 切换路由后容器尺寸可能为 0，会导致地图渲染成灰块，需要在 nextTick 后 invalidateSize()。
 */

import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import shanghaiGeoRaw from '../assets/geo/shanghai.json'
import { AMAP_TILE_URL, GEO_SOURCE_CRS, SHANGHAI_VIEW } from '../domain/constants'
import { transformGeoJSON } from '../utils/geo'
import { districtLabelIcon, placeLabelIcon } from '../utils/mapIcons'

/* 高德栅格瓦片地址已提到 domain/constants.js，与航线规划页的预览地图共用 */

/** 瓦片失败时用透明像素兜底，避免出现碎裂的图片图标 */
const TRANSPARENT_TILE =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

/** 中心城区几个区面积小、标注会叠在一起，做一点人工偏移 */
const LABEL_OFFSET = {
  黄浦区: [0.03, 0.008],
  静安区: [-0.036, 0.014],
  虹口区: [0.03, 0.024],
  长宁区: [-0.052, -0.008],
  普陀区: [-0.026, 0.026],
  徐汇区: [-0.014, -0.03],
}

/**
 * 面积很小的中心城区：低缩放下它们的标注会挤成一团不可读，
 * 因此在 zoom < 11 时整体隐藏，放大后再显示。
 */
const CROWDED_DISTRICTS = new Set(['黄浦区', '静安区', '虹口区', '长宁区', '普陀区', '徐汇区'])
const CROWDED_MIN_ZOOM = 11

const AIRPORTS = [
  { name: '上海虹桥国际机场', lngLat: [121.3363, 31.1979] },
  { name: '上海浦东国际机场', lngLat: [121.8083, 31.1434] },
]

export function useLeafletMap(containerRef) {
  /** 绝不能放进 reactive：Leaflet 实例内部有大量自引用 */
  const map = shallowRef(null)
  const ready = ref(false)
  const tileFailed = ref(false)
  const districtsReady = ref(false)

  /** 业务图层分组，组件按类增量更新，绝不重建地图 */
  const layerGroups = {
    airspaces: null,
    trafficZones: null,
    missionAreas: null,
    routes: null,
    drones: null,
    events: null,
  }

  let tileLayer = null
  let tileErrorCount = 0
  let resizeObserver = null

  function addBaseLayers(instance) {
    tileLayer = L.tileLayer(AMAP_TILE_URL, {
      subdomains: ['1', '2', '3', '4'],
      minZoom: SHANGHAI_VIEW.minZoom,
      maxZoom: SHANGHAI_VIEW.maxZoom,
      className: 'amap-tiles',
      errorTileUrl: TRANSPARENT_TILE,
      detectRetina: false,
    })

    tileLayer.on('tileerror', () => {
      tileErrorCount += 1
      // 连续多片失败就认为底图不可用，页面上给出降级提示（本地边界仍在渲染，不会白屏）
      if (tileErrorCount >= 6 && !tileFailed.value) tileFailed.value = true
    })

    tileLayer.on('tileload', () => {
      if (tileFailed.value) tileFailed.value = false
    })

    tileLayer.addTo(instance)
  }

  /**
   * 本地行政区边界 + 区名标注。
   * 这一层不依赖网络，瓦片挂掉时它就是地图的地理参照，保证不白屏。
   */
  function addDistrictLayers(instance) {
    const geojson = transformGeoJSON(shanghaiGeoRaw, GEO_SOURCE_CRS, 'gcj02')

    L.geoJSON(geojson, {
      interactive: false,
      style: {
        color: '#aeb9c4',
        weight: 1,
        opacity: 0.9,
        fill: false,
      },
    }).addTo(instance)

    const labelGroup = L.layerGroup().addTo(instance)
    const crowdedMarkers = []

    geojson.features.forEach((feature) => {
      const { name, center } = feature.properties
      if (!name || !center) return
      const offset = LABEL_OFFSET[name] || [0, 0]
      const marker = L.marker([center[1] + offset[1], center[0] + offset[0]], {
        interactive: false,
        keyboard: false,
        icon: districtLabelIcon(name),
      })

      if (CROWDED_DISTRICTS.has(name)) {
        crowdedMarkers.push(marker)
      } else {
        marker.addTo(labelGroup)
      }
    })

    // 中心城区标注按缩放级别整体显隐
    const syncCrowdedLabels = () => {
      const visible = instance.getZoom() >= CROWDED_MIN_ZOOM
      crowdedMarkers.forEach((marker) => {
        const attached = labelGroup.hasLayer(marker)
        if (visible && !attached) marker.addTo(labelGroup)
        if (!visible && attached) labelGroup.removeLayer(marker)
      })
    }
    instance.on('zoomend', syncCrowdedLabels)
    syncCrowdedLabels()

    // 机场地标
    AIRPORTS.forEach((airport) => {
      L.marker([airport.lngLat[1], airport.lngLat[0]], {
        interactive: false,
        keyboard: false,
        icon: placeLabelIcon(airport.name),
      }).addTo(instance)
    })

    districtsReady.value = true
  }

  function addControls(instance) {
    L.control.scale({ imperial: false, position: 'bottomright', maxWidth: 130 }).addTo(instance)
    L.control.zoom({ position: 'bottomright', zoomInTitle: '放大', zoomOutTitle: '缩小' }).addTo(instance)
  }

  function addBusinessLayers(instance) {
    Object.keys(layerGroups).forEach((key) => {
      layerGroups[key] = L.layerGroup().addTo(instance)
    })
  }

  function mount() {
    if (map.value || !containerRef.value) return

    const instance = L.map(containerRef.value, {
      center: SHANGHAI_VIEW.center,
      zoom: SHANGHAI_VIEW.zoom,
      minZoom: SHANGHAI_VIEW.minZoom,
      maxZoom: SHANGHAI_VIEW.maxZoom,
      maxBounds: SHANGHAI_VIEW.bounds,
      maxBoundsViscosity: 1,
      zoomControl: false,
      attributionControl: false,
      preferCanvas: false,
      zoomSnap: 0.5,
      wheelPxPerZoomLevel: 120,
    })

    addBaseLayers(instance)
    addDistrictLayers(instance)
    addControls(instance)
    addBusinessLayers(instance)

    map.value = instance
    ready.value = true

    // 开发期把实例挂到 window，方便在控制台或走查脚本里调试坐标系与图层
    if (import.meta.env.DEV) {
      window.__leafletMap = instance
      window.__leafletL = L
    }

    // 容器尺寸变化（侧栏折叠、窗口缩放）时同步 Leaflet
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => instance.invalidateSize({ animate: false }))
      resizeObserver.observe(containerRef.value)
    }
  }

  function invalidate() {
    map.value?.invalidateSize({ animate: false })
  }

  onMounted(mount)

  onBeforeUnmount(() => {
    resizeObserver?.disconnect()
    resizeObserver = null
    tileLayer?.off()
    tileLayer = null
    map.value?.remove()
    map.value = null
    ready.value = false
    Object.keys(layerGroups).forEach((key) => {
      layerGroups[key] = null
    })
  })

  return { map, ready, tileFailed, districtsReady, layerGroups, invalidate, mount }
}

/**
 * ECharts 封装（按需引入，减小产物体积）。
 * 主题基线统一在这里定义，保证统计分析页所有图表是同一套浅色极简风格。
 */

import { onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
} from 'echarts/components'
import { LabelLayout } from 'echarts/features'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  LabelLayout,
  CanvasRenderer,
])

/** 与 tokens.css 的语义色保持一致 */
export const CHART_COLORS = ['#2f6feb', '#1f9c9c', '#b8801c', '#cc4b4b', '#7a5bd0', '#2e8a5a']

const AXIS_LINE = { lineStyle: { color: '#e4e7ea' } }
const AXIS_LABEL = { color: '#8d97a3', fontSize: 11 }
const SPLIT_LINE = { lineStyle: { color: '#f0f2f4', type: 'dashed' } }

/** 浅色极简主题基线：细网格、无边框、灰阶坐标轴 */
export const chartBase = {
  color: CHART_COLORS,
  textStyle: {
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    fontSize: 12,
    color: '#171a1f',
  },
  grid: { left: 8, right: 12, top: 28, bottom: 4, containLabel: true },
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#ffffff',
    borderColor: '#e4e7ea',
    borderWidth: 1,
    padding: [6, 10],
    textStyle: { color: '#171a1f', fontSize: 12 },
    extraCssText: 'box-shadow: 0 4px 14px rgba(16,24,40,.1); border-radius: 6px;',
    axisPointer: { type: 'line', lineStyle: { color: '#d3d8de' } },
  },
  categoryAxis: {
    type: 'category',
    axisLine: AXIS_LINE,
    axisTick: { show: false },
    axisLabel: AXIS_LABEL,
  },
  valueAxis: {
    type: 'value',
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: AXIS_LABEL,
    splitLine: SPLIT_LINE,
  },
}

/** 折线图默认样式：平滑、细线、面积淡填充 */
export function lineSeries(name, data, color, { area = true } = {}) {
  return {
    name,
    type: 'line',
    data,
    smooth: true,
    symbol: 'circle',
    symbolSize: 5,
    showSymbol: false,
    lineStyle: { width: 2, color },
    itemStyle: { color },
    areaStyle: area
      ? {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: `${color}26` },
            { offset: 1, color: `${color}00` },
          ]),
        }
      : undefined,
  }
}

/** 柱状图默认样式：圆角、低饱和 */
export function barSeries(name, data, color, { horizontal = false } = {}) {
  return {
    name,
    type: 'bar',
    data,
    barMaxWidth: 18,
    itemStyle: { color, borderRadius: horizontal ? [0, 3, 3, 0] : [3, 3, 0, 0] },
  }
}

export function useChart(containerRef, optionRef) {
  const chart = shallowRef(null)
  let observer = null

  onMounted(() => {
    if (!containerRef.value) return
    chart.value = echarts.init(containerRef.value, null, { renderer: 'canvas' })
    chart.value.setOption(optionRef.value)

    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => chart.value?.resize())
      observer.observe(containerRef.value)
    }
  })

  watch(
    optionRef,
    (option) => {
      chart.value?.setOption(option, true)
    },
    { deep: true }
  )

  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
    chart.value?.dispose()
    chart.value = null
  })

  return { chart }
}

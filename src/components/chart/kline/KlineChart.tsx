import { useEffect, useRef } from 'react'
import type { Time, IChartApi, ISeriesApi, CandlestickData } from 'lightweight-charts'
import { ColorType, createChart } from 'lightweight-charts'
import { chartTheme } from '../prediction/segment/chartTheme'
import type { Timeframe } from '../../../klineData/types'
import { TIMEFRAME_WINDOW_SECONDS } from '../../../klineData/types'
import { toNumberTime } from '../shared/utils'
import type { UTCTimestamp } from 'lightweight-charts'
import type { Note } from '../../../noteStore/note/types'

type Props = {
  containerRef: React.RefObject<HTMLDivElement | null>
  candles: CandlestickData<Time>[]
  activeMarkerTime?: number
  activeNote?: Note | null
  timeframe: Timeframe
  onChartReady?: (chart: IChartApi, series: ISeriesApi<'Candlestick'>) => void
}

/**
 * K线图表渲染组件
 * 负责创建图表实例、设置K线数据和标记
 */
export function KlineChart({
  containerRef,
  candles,
  activeMarkerTime,
  activeNote,
  timeframe,
  onChartReady,
}: Props) {
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const isDisposedRef = useRef(false)

  // 初始化图表
  useEffect(() => {
    if (!containerRef.current) return

    isDisposedRef.current = false

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: chartTheme.dimensions.height,
      layout: {
        background: { type: ColorType.Solid, color: chartTheme.layout.background },
        textColor: chartTheme.layout.textColor,
      },
      crosshair: {
        mode: 1,
        vertLine: {
          labelVisible: true,
        },
        horzLine: {
          labelVisible: true,
        },
      },
      grid: {
        vertLines: { color: chartTheme.grid.vertLines },
        horzLines: { color: chartTheme.grid.horzLines },
      },
      timeScale: {
        borderColor: chartTheme.border.timeScale,
        timeVisible: true,
        secondsVisible: false,
      },
      localization: {
        dateFormat: 'yyyy-MM-dd',
      },
      rightPriceScale: { borderColor: chartTheme.border.priceScale },
    })

    const series = chart.addCandlestickSeries({
      upColor: chartTheme.candlestick.up.color,
      borderUpColor: chartTheme.candlestick.up.border,
      wickUpColor: chartTheme.candlestick.up.wick,
      downColor: chartTheme.candlestick.down.color,
      borderDownColor: chartTheme.candlestick.down.border,
      wickDownColor: chartTheme.candlestick.down.wick,
    })

    chartRef.current = chart
    seriesRef.current = series
    chart.timeScale().fitContent()

    const resizeObserver = new ResizeObserver((entries) => {
      if (isDisposedRef.current) return
      for (const entry of entries) {
        if (!isDisposedRef.current) {
          chart.applyOptions({ width: entry.contentRect.width })
        }
      }
    })
    resizeObserver.observe(containerRef.current)

    onChartReady?.(chart, series)

    return () => {
      isDisposedRef.current = true
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [containerRef, onChartReady])

  // 更新 K 线数据
  useEffect(() => {
    if (isDisposedRef.current || !seriesRef.current || !candles.length) return
    seriesRef.current.setData(candles)
    if (!isDisposedRef.current && chartRef.current) {
      chartRef.current.timeScale().fitContent()
    }
  }, [candles])

  // 处理激活标记的可见范围
  useEffect(() => {
    if (isDisposedRef.current || !activeMarkerTime || !chartRef.current || !candles.length) return

    const firstCandleTime = toNumberTime(candles[0].time)
    const lastCandleTime = toNumberTime(candles[candles.length - 1].time)

    if (activeMarkerTime < firstCandleTime || activeMarkerTime > lastCandleTime) {
      return
    }

    if (isDisposedRef.current) return

    // 再次检查图表是否仍然有效
    const chart = chartRef.current
    if (!chart) return

    try {
      const windowSeconds = TIMEFRAME_WINDOW_SECONDS[timeframe]
      let from = (activeMarkerTime - windowSeconds) as UTCTimestamp
      
      // 计算预测的终点时间（如果有 activeNote）
      let predictionEndTime: number | undefined
      if (activeNote && activeNote.interval) {
        predictionEndTime = activeMarkerTime + activeNote.interval
      }
      
      // 设置可见范围的终点：至少包含预测终点时间，或者使用默认窗口
      let to: UTCTimestamp
      if (predictionEndTime !== undefined) {
        // 确保可见范围包含预测终点，并添加一些缓冲
        const bufferSeconds = Math.max(windowSeconds * 0.2, 7 * 24 * 60 * 60) // 至少7天缓冲
        to = (Math.max(activeMarkerTime + windowSeconds, predictionEndTime + bufferSeconds)) as UTCTimestamp
      } else {
        to = (activeMarkerTime + windowSeconds) as UTCTimestamp
      }

      const timeScale = chart.timeScale()
      if (timeScale) {
        timeScale.setVisibleRange({ from, to })
      }
    } catch (error) {
      // 如果图表已被销毁，忽略错误
      if (error instanceof Error && (error.message.includes('disposed') || error.message.includes('null'))) {
        return
      }
      // 其他错误重新抛出
      throw error
    }
  }, [activeMarkerTime, activeNote, timeframe, candles])

  return null
}


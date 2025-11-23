import { useEffect, useRef } from 'react'
import type { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts'
import type { PredictionSegment } from './types'
import { generateCurvePoints, generateRangeWavePoints } from './generateCurve'
import { chartTheme } from './chartTheme'

type Props = {
  chart: IChartApi | null
  predictionSegments: PredictionSegment[]
}

/**
 * 预测线段覆盖层组件
 * 负责在 K 线图上绘制预测线段
 * 注意：预测标记由 MarkerOverlay 组件单独处理
 */
export function SegmentOverlay({ chart, predictionSegments }: Props) {
  const predictionSeriesRef = useRef<ISeriesApi<'Line'>[]>([])
  const isDisposedRef = useRef(false)

  // 更新预测线
  useEffect(() => {
    console.log('SegmentOverlay useEffect:', { 
      hasChart: !!chart, 
      segmentsCount: predictionSegments.length,
      endTimes: predictionSegments.map(s => ({
        endTime: s.endTime,
        endTimeDate: new Date(s.endTime * 1000).toLocaleString('zh-CN')
      }))
    })
    
    if (!chart) {
      console.log('SegmentOverlay: chart is null, returning')
      return
    }

    isDisposedRef.current = false

    // 清除旧的预测线
    predictionSeriesRef.current.forEach((line) => {
      if (!isDisposedRef.current && chart) {
        try {
          chart.removeSeries(line)
        } catch (error) {
          // 如果图表已被销毁，忽略错误
          if (error instanceof Error && (error.message.includes('disposed') || error.message.includes('null') || error.message.includes('undefined'))) {
            return
          }
          throw error
        }
      }
    })
    predictionSeriesRef.current = []

    // 添加新的预测线
    predictionSegments.forEach((segment) => {
      if (isDisposedRef.current || !chart) return

      // 跳过 startTime === endTime 的情况，避免重复时间戳错误
      if (segment.startTime === segment.endTime) return

      let lineSeries: ISeriesApi<'Line'>
      try {
        // 再次检查图表是否仍然有效
        if (!chart) return
        lineSeries = chart.addLineSeries({
          color: segment.color,
          lineWidth: chartTheme.prediction.lineWidth,
          priceLineVisible: false,
          lastValueVisible: false,
        })
      } catch (error) {
        // 如果图表已被销毁，忽略错误
        if (error instanceof Error && (error.message.includes('disposed') || error.message.includes('null') || error.message.includes('undefined') || error.message.includes('_internal_addDataSource'))) {
          return
        }
        throw error
      }

      // 如果是震荡行情，使用波浪线；否则使用曲线拟合
      console.log('segment endTime:', segment.endTime, 'date:', new Date(segment.endTime * 1000).toLocaleString('zh-CN'))
      const curvePoints = segment.isRange
        ? generateRangeWavePoints(
            segment.startTime,
            segment.startPrice,
            segment.endTime,
            segment.endPrice,
          )
        : generateCurvePoints(
            segment.startTime,
            segment.startPrice,
            segment.endTime,
            segment.endPrice,
            segment.midTime,
            segment.midPrice,
          )

      // 转换为图表数据格式，确保按时间升序排列
      // 过滤掉无效的价格值（undefined, NaN, null）
      const dataPoints = curvePoints
        .map((point) => ({
          time: point.time as UTCTimestamp,
          value: point.price,
        }))
        .filter((point) => {
          // 确保 value 是有效的数字
          return (
            typeof point.value === 'number' &&
            !Number.isNaN(point.value) &&
            isFinite(point.value) &&
            point.value > 0
          )
        })
        .sort((a, b) => (a.time as number) - (b.time as number))

      // 如果没有有效的数据点，跳过这条线
      if (dataPoints.length === 0) {
      if (!isDisposedRef.current && chart) {
        try {
          chart.removeSeries(lineSeries)
        } catch (error) {
          if (error instanceof Error && (error.message.includes('disposed') || error.message.includes('null') || error.message.includes('undefined'))) {
            return
          }
          throw error
        }
      }
      return
    }

    if (!isDisposedRef.current && chart) {
      try {
        lineSeries.setData(dataPoints)
        predictionSeriesRef.current.push(lineSeries)
      } catch (error) {
        // 如果图表已被销毁，忽略错误
        if (error instanceof Error && (error.message.includes('disposed') || error.message.includes('null') || error.message.includes('undefined'))) {
          return
        }
        throw error
      }
    }
    })

    return () => {
      isDisposedRef.current = true
      predictionSeriesRef.current.forEach((line) => {
        if (chart) {
          try {
            chart.removeSeries(line)
          } catch (error) {
            // 如果图表已被销毁，忽略错误
            if (error instanceof Error && (error.message.includes('disposed') || error.message.includes('null') || error.message.includes('undefined'))) {
              return
            }
            // 其他错误在清理时也忽略，避免影响卸载
          }
        }
      })
      predictionSeriesRef.current = []
    }
  }, [chart, predictionSegments])

  // 此组件不渲染任何 DOM，只负责在图表上添加标注
  return null
}


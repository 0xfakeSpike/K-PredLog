import type { CandlestickData } from 'lightweight-charts'
import type { NoteMarker } from '../../../../noteStore/note/types'
import { normalizeDirection } from '../../../../noteStore/note/noteUtils'
import { chartTheme } from './chartTheme'
import type { PredictionSegment } from './types'
import {
  toNumberTime,
  findClosestCandleIndex,
} from '../../shared/utils'

/**
 * 构建预测线段
 * 根据笔记标记和K线数据，生成预测线的起点、中间点和终点
 */
export function buildPredictionSegments(
  markers: NoteMarker[],
  candles: CandlestickData<any>[],
): PredictionSegment[] {
  if (!candles.length) {
    return []
  }
  
  const candlePoints = candles
    .map((candle) => ({
      time: toNumberTime(candle.time),
      value: candle.close,
    }))
    .filter((point) => {
      // 过滤掉无效的价格值
      return (
        typeof point.value === 'number' &&
        !Number.isNaN(point.value) &&
        isFinite(point.value) &&
        point.value > 0
      )
    })

  // 如果没有有效的 K 线数据点，返回空数组
  if (candlePoints.length === 0) {
    return []
  }

  // 获取 K 线数据的时间范围
  const firstCandleTime = candlePoints[0].time
  const lastCandleTime = candlePoints[candlePoints.length - 1].time

  const result = markers
    .map((marker) => {
      // 检查标记时间是否在 K 线数据范围内
      // 如果标记时间太早，直接跳过
      if (marker.time < firstCandleTime) {
        return null
      }
      // 如果标记时间在最后一天之后，仍然允许（可能是预测未来），使用最后一个K线作为起点

      // intervalLabel 是天数（用于显示），需要转换为秒数
      const intervalDays = Number(marker.intervalLabel)
      const intervalSeconds = intervalDays * 24 * 60 * 60
      if (!intervalSeconds || Number.isNaN(intervalSeconds)) {
        return null
      }

      const direction = normalizeDirection(marker.directionLabel)

      // 找到最接近标记时间的K线（而不是第一个大于等于的）
      const startPoint = findClosestCandleIndex(candlePoints, marker.time)
      if (!startPoint) {
        return null
      }

      // 验证起点价格是否有效
      if (
        typeof startPoint.value !== 'number' ||
        Number.isNaN(startPoint.value) ||
        !isFinite(startPoint.value) ||
        startPoint.value <= 0
      ) {
        return null
      }

      const targetTime = marker.time + intervalSeconds

      // 如果目标时间也在 K 线数据范围内，才生成预测线
      // 注意：对于超出范围的情况，我们仍然允许生成（因为可能是预测未来）
      // 但起点必须在范围内
      const targetPoint = findClosestCandleIndex(
        candlePoints,
        targetTime,
        direction ? { startPrice: startPoint.value, direction } : undefined
      )
      
      if (!targetPoint) {
        return null
      }

      // 计算中间点（起点和终点之间的中点）
      let midTime: number | undefined
      let midPrice: number | undefined
      let endTime: number
      let endPrice: number

      // 检查是否是未来预测（targetPoint 的时间是否超过最后一个K线时间）
      const isFuturePrediction = targetPoint.time > lastCandleTime

      if (isFuturePrediction) {
        // 目标时间超过了最新K线，使用 findClosestCandleIndex 返回的未来预测点
        endTime = targetPoint.time
        endPrice = targetPoint.value
        
        // 计算中间点（时间中点，价格线性插值）
        if (direction === 'range') {
          // 震荡行情不需要中间点，波浪线会自己生成
          midTime = undefined
          midPrice = undefined
        } else {
          midTime = startPoint.time + (endTime - startPoint.time) / 2
          midPrice = startPoint.value + (endPrice - startPoint.value) / 2
        }
      } else {
        // 有终点，使用三个点拟合
        // 如果起点和终点是同一个K线，说明预测周期太短（在同一天内），跳过
        if (startPoint.time === targetPoint.time) {
          return null
        }
        
        // 验证终点价格是否有效
        if (
          typeof targetPoint.value !== 'number' ||
          Number.isNaN(targetPoint.value) ||
          !isFinite(targetPoint.value) ||
          targetPoint.value <= 0
        ) {
          return null
        }

        if (direction === 'range') {
          return {
            startTime: startPoint.time,
            startPrice: startPoint.value,
            midTime: startPoint.time + (targetPoint.time - startPoint.time) / 2,
            midPrice: startPoint.value,
            endTime: targetPoint.time,
            endPrice: startPoint.value,
            color: chartTheme.prediction.colors.range,
            isRange: true, // 标记为震荡行情
          }
        }

        if (!direction) return null

        const isSuccess =
          direction === 'long'
            ? targetPoint.value >= startPoint.value
            : targetPoint.value <= startPoint.value

        endTime = targetPoint.time
        endPrice = isSuccess
          ? targetPoint.value
          : startPoint.value * 2 - targetPoint.value

        // 如果预测方向错误，不使用中间点，只用两个点拟合
        if (!isSuccess) {
          // 预测方向错误，不设置中间点
          midTime = undefined
          midPrice = undefined
        } else {
          // 预测方向正确，计算中间点（使用实际的中间K线）
          // 找到起点和终点在 candlePoints 中的索引
          const startIdx = candlePoints.findIndex((p) => p.time === startPoint.time)
          const targetIdx = candlePoints.findIndex((p) => p.time === targetPoint.time)
          
          if (startIdx !== -1 && targetIdx !== -1 && startIdx < targetIdx) {
            const midIdx = Math.floor((startIdx + targetIdx) / 2)
            if (midIdx > startIdx && midIdx < targetIdx) {
              const midPoint = candlePoints[midIdx]
              // 验证中间点价格是否有效
              if (
                typeof midPoint.value === 'number' &&
                !Number.isNaN(midPoint.value) &&
                isFinite(midPoint.value) &&
                midPoint.value > 0
              ) {
                midTime = midPoint.time
                midPrice = midPoint.value
              } else {
                // 如果中间点价格无效，使用时间中点
                midTime = startPoint.time + (endTime - startPoint.time) / 2
                midPrice = startPoint.value + (endPrice - startPoint.value) / 2
              }
            } else {
              // 如果没有合适的中间K线，使用时间中点
              midTime = startPoint.time + (endTime - startPoint.time) / 2
              midPrice = startPoint.value + (endPrice - startPoint.value) / 2
            }
          } else {
            // 如果没有找到索引或索引无效，使用时间中点
            midTime = startPoint.time + (endTime - startPoint.time) / 2
            midPrice = startPoint.value + (endPrice - startPoint.value) / 2
          }
        }
      }

      const color: string =
        direction === 'long'
          ? chartTheme.prediction.colors.long
          : direction === 'short'
          ? chartTheme.prediction.colors.short
          : chartTheme.prediction.colors.range

      // 最终验证所有价格值是否有效
      if (
        !isFinite(startPoint.value) ||
        !isFinite(endPrice) ||
        startPoint.value <= 0 ||
        endPrice <= 0
      ) {
        return null
      }
      
      // 如果中间点存在，验证中间点价格
      if (midPrice !== undefined && (!isFinite(midPrice) || midPrice <= 0)) {
        midTime = undefined
        midPrice = undefined
      }

      const segment = {
        startTime: startPoint.time,
        startPrice: startPoint.value,
        midTime,
        midPrice,
        endTime,
        endPrice,
        color,
        isRange: direction === 'range', // 标记是否为震荡行情
      } as PredictionSegment
      
      return segment
    })
    .filter((segment): segment is PredictionSegment => segment !== null)
  
  return result
}


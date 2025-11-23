import type { CandlestickData, SeriesMarker, Time } from 'lightweight-charts'
import type { NoteMarker } from '../../../../noteStore/note/types'
import { toNumberTime, findClosestCandleIndex } from '../../shared/utils'

/**
 * 将 NoteMarker 转换为 lightweight-charts 的 SeriesMarker
 * 确保标记时间与K线时间对齐
 * 只渲染时间在 K 线数据范围内的标记
 */
export function transformNoteMarkers(
  markers: NoteMarker[],
  candles: CandlestickData<Time>[],
): SeriesMarker<Time>[] {
  if (!candles.length) return []
  const candlePoints = candles.map((candle) => ({
    time: toNumberTime(candle.time),
    originalTime: candle.time,
  }))

  // 获取 K 线数据的时间范围
  const firstCandleTime = candlePoints[0].time
  const lastCandleTime = candlePoints[candlePoints.length - 1].time

  return markers
    .map((marker) => {
      // 检查标记时间是否在 K 线数据范围内
      if (marker.time < firstCandleTime || marker.time > lastCandleTime) {
        return null
      }

      // 找到最接近标记时间的K线时间戳
      const closestPoint = findClosestCandleIndex(
        candlePoints.map((p) => ({ time: p.time, value: 0 })),
        marker.time,
      )
      if (!closestPoint) return null

      // 找到对应的原始时间戳
      const closestIdx = candlePoints.findIndex((p) => p.time === closestPoint.time)
      if (closestIdx === -1) return null
      const matchedTime = candlePoints[closestIdx].originalTime

      return {
        time: matchedTime,
        position: marker.position,
        color: marker.color,
        shape: marker.shape,
        text: marker.intervalLabel
          ? `${marker.directionLabel} · ${marker.intervalLabel}天`
          : marker.directionLabel,
      } as SeriesMarker<Time>
    })
    .filter((marker): marker is SeriesMarker<Time> => Boolean(marker))
}


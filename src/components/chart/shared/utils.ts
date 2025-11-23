import type { BusinessDay, Time } from 'lightweight-charts'

/**
 * 将 lightweight-charts 的 Time 类型转换为数字时间戳（秒）
 */
export function toNumberTime(time: Time): number {
  if (typeof time === 'number') return time
  if (typeof time === 'string') {
    const parsed = Date.parse(time)
    return Number.isNaN(parsed) ? 0 : Math.floor(parsed / 1000)
  }
  const { year, month, day } = time as BusinessDay
  const date = new Date(Date.UTC(year, month - 1, day))
  return Math.floor(date.getTime() / 1000)
}

/**
 * 找到最接近目标时间戳的K线点
 * 对于K线图表，应该找到包含目标时间的K线柱子
 * 策略：找到时间戳小于等于目标时间的最后一个K线（即目标时间所在的K线周期）
 * 由图表模块维护，因为这是图表相关的工具函数
 * 
 * @param candlePoints K线数据点数组
 * @param targetTime 目标时间戳（秒）
 * @param futurePrediction 如果目标时间超过K线范围，用于构造未来预测点的参数
 * @returns K线点对象 { time, value }，如果超出范围且未提供 futurePrediction，返回 null
 */
export function findClosestCandleIndex(
  candlePoints: Array<{ time: number; value: number }>,
  targetTime: number,
  futurePrediction?: { startPrice: number; direction: 'long' | 'short' | 'range' },
): { time: number; value: number } | null {
  if (candlePoints.length === 0) return null

  const lastCandleTime = candlePoints[candlePoints.length - 1].time
  
  // 如果目标时间超过最后一个K线时间，处理未来预测
  if (targetTime > lastCandleTime) {
    if (futurePrediction) {
      // 根据方向计算未来价格：多 +30%，空 -30%，震荡保持原价
      let futureValue: number
      if (futurePrediction.direction === 'long') {
        futureValue = futurePrediction.startPrice * 1.3
      } else if (futurePrediction.direction === 'short') {
        futureValue = futurePrediction.startPrice * 0.7
      } else {
        // range 震荡，保持原价
        futureValue = futurePrediction.startPrice
      }
      return {
        time: targetTime,
        value: futureValue,
      }
    }
    return null
  }

  // 找到最后一个时间戳小于等于目标的K线
  // 这是目标时间所在的K线周期
  let bestIdx = -1
  for (let i = candlePoints.length - 1; i >= 0; i--) {
    if (candlePoints[i].time <= targetTime) {
      bestIdx = i
      break
    }
  }

  // 如果没有找到小于等于目标的K线，说明目标时间在所有K线之前，返回第一个
  if (bestIdx === -1) {
    return candlePoints[0]
  }

  // 检查下一个K线是否更接近（如果存在）
  let finalIdx = bestIdx
  if (bestIdx < candlePoints.length - 1) {
    const currentTime = candlePoints[bestIdx].time
    const nextTime = candlePoints[bestIdx + 1].time
    const currentDiff = Math.abs(targetTime - currentTime)
    const nextDiff = Math.abs(targetTime - nextTime)

    // 如果下一个K线更接近，且目标时间更接近下一个K线的开始时间
    // 则选择下一个K线（但通常应该选择包含目标时间的K线，即当前K线）
    if (nextDiff < currentDiff && targetTime > (currentTime + nextTime) / 2) {
      finalIdx = bestIdx + 1
    }
  }

  return candlePoints[finalIdx]
}


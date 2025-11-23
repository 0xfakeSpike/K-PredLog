import type { KlineCandle, Timeframe } from './types'
import { fetchKlineDataBySource } from './dataSource'
import { parseDataSourceId } from './dataSource'
import { fetchLatestKlineData } from './sources/binance'
// 导入数据源，确保它们被注册
import './sources'
import {
  readKlineDataFromStorage,
  writeKlineDataToStorage,
  mergeKlineDataToStorage,
  clearKlineData,
} from './storage'

/**
 * K 线数据管理器
 * 
 * 负责：
 * 1. 向上层组件提供指定时间区间内的 K 线数据
 * 2. 向下管理数据：优先从本地读取，不存在则通过 API 获取
 * 3. 自动将新增的 K 线数据写入本地存储
 */
export class KlineManager {
  /**
   * 获取指定时间区间内的 K 线数据
   * 
   * 策略：
   * 1. 先从本地存储读取
   * 2. 检查本地数据是否覆盖所需的时间区间
   * 3. 如果覆盖不全，从 API 获取缺失的数据
   * 4. 合并数据并更新本地存储
   * 
   * @param timeframe 时间周期
   * @param startTime 起始时间（UTC 时间戳，秒）
   * @param endTime 结束时间（UTC 时间戳，秒）
   * @returns Promise<KlineCandle[]> K 线数据数组
   */
  async getKlineData(
    timeframe: Timeframe,
    startTime: number,
    endTime: number,
    dataSourceId: string = 'binance-btc',
  ): Promise<KlineCandle[]> {
    // 1. 从本地文件读取（传入时间范围以确定读取哪些年份的文件）
    const stored = await readKlineDataFromStorage(timeframe, startTime, endTime, dataSourceId)
    
    if (!stored || stored.candles.length === 0) {
      // 本地没有数据，从 API 获取
      return this.fetchAndStore(timeframe, startTime, endTime, dataSourceId)
    }

    // 2. 检查本地数据是否覆盖所需的时间区间
    const { hasGaps, missingRanges } = this.checkDataCoverage(
      stored.candles,
      startTime,
      endTime,
      timeframe,
    )

    if (!hasGaps) {
      // 本地数据已完全覆盖，直接返回过滤后的数据
      return this.filterCandlesByTimeRange(stored.candles, startTime, endTime)
    }

    // 3. 本地数据有缺失，从 API 获取缺失的部分
    const fetchedCandles: KlineCandle[] = []
    
    for (const range of missingRanges) {
      const data = await fetchKlineDataBySource(dataSourceId, {
        timeframe,
        startTime: range.start,
        endTime: range.end,
      })
      fetchedCandles.push(...data.candles)
    }

    // 4. 合并数据并更新本地文件
    if (fetchedCandles.length > 0) {
      await mergeKlineDataToStorage(timeframe, fetchedCandles, dataSourceId)
      // 重新读取合并后的数据
      const updated = await readKlineDataFromStorage(timeframe, startTime, endTime, dataSourceId)
      if (updated) {
        return this.filterCandlesByTimeRange(
          updated.candles,
          startTime,
          endTime,
        )
      }
    }

    // 如果获取失败，返回本地数据（可能不完整）
    return this.filterCandlesByTimeRange(stored.candles, startTime, endTime)
  }

  /**
   * 从 API 获取数据并存储到本地文件
   */
  private async fetchAndStore(
    timeframe: Timeframe,
    startTime: number,
    endTime: number,
    dataSourceId: string = 'binance-btc',
  ): Promise<KlineCandle[]> {
    const data = await fetchKlineDataBySource(dataSourceId, {
      timeframe,
      startTime,
      endTime,
    })
    
    await writeKlineDataToStorage(timeframe, data.candles, dataSourceId)
    return data.candles
  }

  /**
   * 检查数据覆盖情况
   * 
   * @returns 是否有缺失，以及缺失的时间区间
   */
  private checkDataCoverage(
    candles: KlineCandle[],
    startTime: number,
    endTime: number,
    timeframe: Timeframe,
  ): {
    hasGaps: boolean
    missingRanges: Array<{ start: number; end: number }>
  } {
    if (candles.length === 0) {
      return {
        hasGaps: true,
        missingRanges: [{ start: startTime, end: endTime }],
      }
    }

    // 将时间戳转换为数字
    const times = candles.map((c) =>
      typeof c.time === 'number' ? c.time : Date.parse(c.time as string) / 1000,
    )
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)

    const missingRanges: Array<{ start: number; end: number }> = []

    // 检查起始时间之前是否有缺失
    if (startTime < minTime) {
      missingRanges.push({
        start: startTime,
        end: Math.min(minTime - 1, endTime),
      })
    }

    // 检查结束时间之后是否有缺失
    if (endTime > maxTime) {
      missingRanges.push({
        start: Math.max(maxTime + 1, startTime),
        end: endTime,
      })
    }

    // 检查中间是否有缺失（数据不连续）
    const sortedTimes = [...times].sort((a, b) => a - b)
    const timeframeSecondsMap: Record<Timeframe, number> = {
      '1H': 60 * 60,
      '4H': 4 * 60 * 60,
      '1D': 24 * 60 * 60,
      '1W': 7 * 24 * 60 * 60,
    }
    const timeframeSeconds = timeframeSecondsMap[timeframe] || 24 * 60 * 60
    const maxGapSeconds = timeframeSeconds * 2 // 允许的最大间隔（2个周期）
    
    // 只检查在所需时间范围内的数据
    const relevantTimes = sortedTimes.filter(t => t >= startTime && t <= endTime)
    
    // 计算预期数据点数量
    const expectedCount = Math.ceil((endTime - startTime) / timeframeSeconds)
    const actualCount = relevantTimes.length
    const coverageRatio = actualCount / expectedCount
    
    // 如果覆盖率低于 80%，认为数据不完整，需要重新获取整个范围
    if (coverageRatio < 0.8) {
      return {
        hasGaps: true,
        missingRanges: [{ start: startTime, end: endTime }],
      }
    }
    
    // 检查中间是否有大的间隔
    for (let i = 1; i < relevantTimes.length; i++) {
      const gap = relevantTimes[i] - relevantTimes[i - 1]
      if (gap > maxGapSeconds) {
        // 发现缺失，添加缺失范围
        const gapStart = relevantTimes[i - 1] + timeframeSeconds
        const gapEnd = relevantTimes[i] - timeframeSeconds
        if (gapStart < gapEnd) {
          missingRanges.push({
            start: gapStart,
            end: gapEnd,
          })
        }
      }
    }

    return {
      hasGaps: missingRanges.length > 0,
      missingRanges,
    }
  }

  /**
   * 根据时间区间过滤 K 线数据
   */
  private filterCandlesByTimeRange(
    candles: KlineCandle[],
    startTime: number,
    endTime: number,
  ): KlineCandle[] {
    return candles.filter((candle) => {
      const time = typeof candle.time === 'number'
        ? candle.time
        : Date.parse(candle.time as string) / 1000
      return time >= startTime && time <= endTime
    })
  }

  /**
   * 更新最新的 K 线数据
   * 
   * 用于定时刷新最新数据
   * 
   * @param timeframe 时间周期
   * @param limit 获取最新的数据条数
   */
  async updateLatestData(
    timeframe: Timeframe,
    limit: number = 100,
    dataSourceId: string = 'binance-btc',
  ): Promise<void> {
    try {
      const { source, symbol } = parseDataSourceId(dataSourceId)
      // 目前只支持 Binance，后续可以扩展
      if (source === 'binance') {
        const data = await fetchLatestKlineData(symbol, timeframe, limit)
        await mergeKlineDataToStorage(timeframe, data.candles, dataSourceId)
      } else {
        console.warn(`[KlineManager] Unsupported data source for updateLatestData: ${source}`)
      }
    } catch (error) {
      console.error(`Failed to update latest kline data for ${timeframe}:`, error)
    }
  }

  /**
   * 清除指定时间周期的缓存数据
   * 
   * @param timeframe 时间周期
   */
  clearCache(timeframe: Timeframe): void {
    clearKlineData(timeframe)
  }
}

// 导出单例实例
export const klineManager = new KlineManager()


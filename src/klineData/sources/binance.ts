import type { KlineQueryParams, KlineDataResponse, Timeframe, KlineCandle } from '../types'
import type { UTCTimestamp } from 'lightweight-charts'
import type { KlineDataSource } from '../dataSource'
import { registerDataSource } from '../dataSource'

const BINANCE_API_BASE = 'https://api.binance.com/api/v3'

/**
 * Binance API 配置
 */
const BINANCE_API_CONFIG = {
  /**
   * 单次请求的最大数据条数
   */
  MAX_LIMIT: 1000,
  
  /**
   * 分页请求的最大次数（防止无限循环）
   * 最多可获取 MAX_LIMIT * MAX_REQUESTS 条数据
   */
  MAX_REQUESTS: 10,
  
  /**
   * 获取最新数据时的默认条数
   */
  DEFAULT_LIMIT: 100,
} as const

/**
 * 将 Timeframe 映射到 Binance API 的 interval 格式
 */
function timeframeToBinanceInterval(timeframe: Timeframe): string {
  const mapping: Record<Timeframe, string> = {
    '1H': '1h',
    '4H': '4h',
    '1D': '1d',
    '1W': '1w',
  }
  return mapping[timeframe]
}

/**
 * Binance K 线数据响应格式
 * [开盘时间, 开盘价, 最高价, 最低价, 收盘价, 成交量, 收盘时间, 成交额, 成交笔数, 主动买入成交量, 主动买入成交额, 忽略]
 */
type BinanceKlineItem = [
  number, // 开盘时间 (ms)
  string, // 开盘价
  string, // 最高价
  string, // 最低价
  string, // 收盘价
  string, // 成交量
  number, // 收盘时间 (ms)
  string, // 成交额
  number, // 成交笔数
  string, // 主动买入成交量
  string, // 主动买入成交额
  string, // 忽略
]

/**
 * 将 Binance 返回的数据格式转换为 KlineCandle
 */
function binanceKlineToCandle(item: BinanceKlineItem): KlineCandle {
  const [openTime, open, high, low, close] = item
  
  return {
    time: Math.floor(openTime / 1000) as UTCTimestamp, // 转换为秒级时间戳
    open: parseFloat(open),
    high: parseFloat(high),
    low: parseFloat(low),
    close: parseFloat(close),
  }
}

/**
 * Binance 数据源实现
 */
const binanceDataSource: KlineDataSource = {
  name: 'Binance',
  async fetchKlineData(params: KlineQueryParams & { symbol: string }): Promise<KlineDataResponse> {
    const { timeframe, startTime, endTime, symbol } = params
  
    const interval = timeframeToBinanceInterval(timeframe)
    const binanceSymbol = symbol.includes('USDT') ? symbol : `${symbol}USDT`
    
    // 计算时间周期对应的秒数，用于分页计算
    const timeframeSecondsMap: Record<string, number> = {
      '1h': 60 * 60,
      '4h': 4 * 60 * 60,
      '1d': 24 * 60 * 60,
      '1w': 7 * 24 * 60 * 60,
    }
    const timeframeSeconds = timeframeSecondsMap[interval] || 24 * 60 * 60
    
    // 如果估算的数据量超过限制，需要分页获取
    const allCandles: KlineCandle[] = []
    let currentStartTime = startTime
    let requestCount = 0
    
    while (currentStartTime < endTime && requestCount < BINANCE_API_CONFIG.MAX_REQUESTS) {
      requestCount++
      
      // 计算本次请求的结束时间
      // 每次请求最多 MAX_LIMIT 条数据，但实际可能返回更少
      const currentEndTime = Math.min(
        currentStartTime + BINANCE_API_CONFIG.MAX_LIMIT * timeframeSeconds,
        endTime,
      )
      
      const queryParams = new URLSearchParams({
        symbol: binanceSymbol,
        interval,
        startTime: (currentStartTime * 1000).toString(),
        endTime: (currentEndTime * 1000).toString(),
        limit: BINANCE_API_CONFIG.MAX_LIMIT.toString(),
      })
      
      const url = `${BINANCE_API_BASE}/klines?${queryParams.toString()}`
      
      try {
        const response = await fetch(url)
        
        if (!response.ok) {
          throw new Error(
            `Binance API error: ${response.status} ${response.statusText}`,
          )
        }
        
        const data = (await response.json()) as BinanceKlineItem[]
        
        if (data.length === 0) {
          // 没有更多数据了
          break
        }
        
        // 转换为我们的格式
        const candles: KlineCandle[] = data.map(binanceKlineToCandle)
        allCandles.push(...candles)
        
        // 如果返回的数据少于 limit，说明已经获取完所有数据
        if (candles.length < BINANCE_API_CONFIG.MAX_LIMIT) {
          break
        }
        
        // 更新下一次请求的起始时间：使用最后一条数据的时间 + 一个时间周期
        const lastCandle = candles[candles.length - 1]
        const lastTime = typeof lastCandle.time === 'number'
          ? lastCandle.time
          : Math.floor(Date.parse(lastCandle.time as string) / 1000)
        
        // 检查是否已经达到或超过 endTime
        if (lastTime >= endTime) {
          break
        }
        
        currentStartTime = lastTime + timeframeSeconds
        
        // 避免无限循环
        if (currentStartTime >= endTime) {
          break
        }
      } catch (error) {
        console.error('[BinanceDataSource] Failed to fetch kline data:', error)
        throw new Error(
          `Failed to fetch kline data from Binance: ${error instanceof Error ? error.message : 'Unknown error'}`,
        )
      }
    }
    
    return {
      candles: allCandles,
      timeframe,
      startTime,
      endTime,
    }
  },
}

// 注册 Binance 数据源
registerDataSource('binance', binanceDataSource)

/**
 * 获取最新的 K 线数据（使用 Binance）
 * 
 * @param symbol 标的符号，例如 'BTC', 'ETH'
 * @param timeframe 时间周期
 * @param limit 返回的数据条数，默认 100，最大为 BINANCE_API_CONFIG.MAX_LIMIT
 * @returns Promise<KlineDataResponse> 最新的 K 线数据
 */
export async function fetchLatestKlineData(
  symbol: string,
  timeframe: Timeframe,
  limit: number = BINANCE_API_CONFIG.DEFAULT_LIMIT,
): Promise<KlineDataResponse> {
  const interval = timeframeToBinanceInterval(timeframe)
  const binanceSymbol = symbol.includes('USDT') ? symbol : `${symbol}USDT`
  
  // 限制最大值为配置的最大值
  const actualLimit = Math.min(Math.max(1, limit), BINANCE_API_CONFIG.MAX_LIMIT)
  
  // 构建查询参数（不指定 startTime 和 endTime，获取最新数据）
  const queryParams = new URLSearchParams({
    symbol: binanceSymbol,
    interval,
    limit: actualLimit.toString(),
  })
  
  const url = `${BINANCE_API_BASE}/klines?${queryParams.toString()}`
  
  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(
        `Binance API error: ${response.status} ${response.statusText}`,
      )
    }
    
    const data = (await response.json()) as BinanceKlineItem[]
    
    if (data.length === 0) {
      return {
        candles: [],
        timeframe,
        startTime: 0,
        endTime: 0,
      }
    }
    
    // 转换为我们的格式
    const candles: KlineCandle[] = data.map(binanceKlineToCandle)
    
    // 计算实际的时间范围
    const firstCandle = candles[0]
    const lastCandle = candles[candles.length - 1]
    const startTime = typeof firstCandle.time === 'number'
      ? firstCandle.time
      : Date.parse(firstCandle.time as string) / 1000
    const endTime = typeof lastCandle.time === 'number'
      ? lastCandle.time
      : Date.parse(lastCandle.time as string) / 1000
    
    return {
      candles,
      timeframe,
      startTime,
      endTime,
    }
  } catch (error) {
    console.error('[BinanceDataSource] Failed to fetch latest kline data:', error)
    throw new Error(
      `Failed to fetch latest kline data from Binance: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}


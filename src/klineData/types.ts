import type { CandlestickData, Time } from 'lightweight-charts'

export type Timeframe = '1H' | '4H' | '1D' | '1W'

/**
 * K线数据点
 */
export type KlineCandle = CandlestickData<Time>

/**
 * K线数据查询参数
 */
export type KlineQueryParams = {
  timeframe: Timeframe
  startTime: number // UTC 时间戳（秒）
  endTime: number // UTC 时间戳（秒）
}

/**
 * K线数据响应
 */
export type KlineDataResponse = {
  candles: KlineCandle[]
  timeframe: Timeframe
  startTime: number
  endTime: number
}

/**
 * 本地存储的 K 线数据
 */
export type StoredKlineData = {
  timeframe: Timeframe
  candles: KlineCandle[]
  lastUpdated: string // ISO 时间字符串
}

/**
 * 时间周期选项
 * 由 K 线数据模块维护
 */
export const TIMEFRAME_OPTIONS: Timeframe[] = ['1H', '4H', '1D', '1W']

/**
 * 时间周期对应的窗口大小（秒）
 * 用于控制图表可见范围
 */
export const TIMEFRAME_WINDOW_SECONDS: Record<Timeframe, number> = {
  '1H': 60 * 60 * 24,        // 1 天
  '4H': 60 * 60 * 24 * 2,    // 2 天
  '1D': 60 * 60 * 24 * 30,   // 30 天
  '1W': 60 * 60 * 24 * 180,  // 180 天
}

/**
 * 默认时间范围配置（天数）
 * 用于计算默认的 K 线数据查询范围
 */
export const TIMEFRAME_DEFAULT_DAYS: Record<Timeframe, number> = {
  '1H': 7,   // 7 天
  '4H': 14,  // 14 天
  '1D': 30,  // 30 天
  '1W': 180, // 180 天（约 6 个月）
}

/**
 * 时间周期对应的历史数据范围（天数）
 * 用于在笔记时间点之前显示的历史数据
 */
export const TIMEFRAME_BEFORE_DAYS: Record<Timeframe, number> = {
  '1H': 7,   // 1小时K线：往前 7 天
  '4H': 14,  // 4小时K线：往前 14 天
  '1D': 30,  // 日线：往前 30 天
  '1W': 90,  // 周线：往前 90 天
}


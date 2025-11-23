import type { KlineCandle, Timeframe, StoredKlineData } from './types'
import {
  readKlineDataFromFile,
  writeKlineDataToFile,
  mergeKlineDataToFile,
  clearKlineDataFile,
  setKlineDataDirectory as setKlineDataDir,
} from './fileStorage'

/**
 * 设置 K 线数据存储目录
 * 
 * @param handle 目录句柄
 */
export function setKlineDataDirectory(handle: FileSystemDirectoryHandle | null): void {
  setKlineDataDir(handle)
}

/**
 * 从本地文件读取 K 线数据
 * 
 * @param timeframe 时间周期
 * @param startTime 起始时间（可选，用于确定读取哪些年份的文件）
 * @param endTime 结束时间（可选，用于确定读取哪些年份的文件）
 * @param dataSourceId 数据源标识符，例如 'binance-btc'
 * @returns Promise<StoredKlineData | null> 如果不存在则返回 null
 */
export async function readKlineDataFromStorage(
  timeframe: Timeframe,
  startTime?: number,
  endTime?: number,
  dataSourceId?: string,
): Promise<StoredKlineData | null> {
  return readKlineDataFromFile(timeframe, startTime, endTime, dataSourceId)
}

/**
 * 将 K 线数据写入本地文件
 * 
 * @param timeframe 时间周期
 * @param candles K 线数据数组
 * @param dataSourceId 数据源标识符，例如 'binance-btc'
 */
export async function writeKlineDataToStorage(
  timeframe: Timeframe,
  candles: KlineCandle[],
  dataSourceId?: string,
): Promise<void> {
  return writeKlineDataToFile(timeframe, candles, dataSourceId)
}

/**
 * 合并新的 K 线数据到现有文件
 * 
 * 根据时间戳去重，保留最新的数据
 * 
 * @param timeframe 时间周期
 * @param newCandles 新的 K 线数据
 * @param dataSourceId 数据源标识符，例如 'binance-btc'
 */
export async function mergeKlineDataToStorage(
  timeframe: Timeframe,
  newCandles: KlineCandle[],
  dataSourceId?: string,
): Promise<void> {
  return mergeKlineDataToFile(timeframe, newCandles, dataSourceId)
}

/**
 * 清除指定时间周期的 K 线数据
 * 
 * @param timeframe 时间周期
 */
export async function clearKlineData(timeframe: Timeframe): Promise<void> {
  return clearKlineDataFile(timeframe)
}


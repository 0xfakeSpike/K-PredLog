import type { KlineCandle, Timeframe, StoredKlineData } from './types'

/**
 * K 线数据文件存储
 * 使用 File System Access API 将数据写入本地文件
 */

let klineDataDirectoryHandle: FileSystemDirectoryHandle | null = null

/**
 * 设置 K 线数据存储目录
 * 
 * @param handle 目录句柄
 */
export function setKlineDataDirectory(handle: FileSystemDirectoryHandle | null): void {
  klineDataDirectoryHandle = handle
}

/**
 * 从时间戳获取年份
 */
function getYearFromTimestamp(timestamp: number): number {
  return new Date(timestamp * 1000).getUTCFullYear()
}

/**
 * 生成文件名（按年）
 */
function getFilename(timeframe: Timeframe, year: number, dataSourceId?: string): string {
  if (dataSourceId) {
    return `kline_${timeframe}_${dataSourceId}_${year}.json`
  }
  // 向后兼容：如果没有 dataSourceId，使用旧格式
  return `kline_${timeframe}_${year}.json`
}

/**
 * 获取时间范围内的所有年份
 */
function getYearsInRange(startTime: number, endTime: number): number[] {
  const startYear = getYearFromTimestamp(startTime)
  const endYear = getYearFromTimestamp(endTime)
  const years: number[] = []
  for (let year = startYear; year <= endYear; year++) {
    years.push(year)
  }
  return years
}

/**
 * 从本地文件读取 K 线数据（按年）
 * 
 * @param timeframe 时间周期
 * @param startTime 起始时间（可选，用于确定读取哪些年份的文件）
 * @param endTime 结束时间（可选，用于确定读取哪些年份的文件）
 * @returns Promise<StoredKlineData | null> 如果不存在则返回 null
 */
export async function readKlineDataFromFile(
  timeframe: Timeframe,
  startTime?: number,
  endTime?: number,
  dataSourceId?: string,
): Promise<StoredKlineData | null> {
  if (!klineDataDirectoryHandle) {
    return null
  }

  try {
    // 如果没有指定时间范围，尝试读取旧格式文件（向后兼容）
    if (startTime === undefined || endTime === undefined) {
      const oldFilename = `kline_${timeframe}.json`
      try {
        const fileHandle = await klineDataDirectoryHandle.getFileHandle(oldFilename, {
          create: false,
        })
        const file = await fileHandle.getFile()
        const text = await file.text()
        const data = JSON.parse(text) as StoredKlineData

        if (
          data.timeframe &&
          Array.isArray(data.candles) &&
          data.lastUpdated
        ) {
          return data
        }
      } catch {
        // 旧文件不存在，继续按年读取
      }
    }

    // 确定需要读取的年份
    const years = startTime && endTime
      ? getYearsInRange(startTime, endTime)
      : [new Date().getUTCFullYear()] // 默认读取当前年份

    const allCandles: KlineCandle[] = []
    let latestUpdate: string | null = null

    // 读取所有相关年份的文件
    for (const year of years) {
      const filename = getFilename(timeframe, year, dataSourceId)
      try {
        const fileHandle = await klineDataDirectoryHandle.getFileHandle(filename, {
          create: false,
        }).catch(() => null)

        if (!fileHandle) {
          continue
        }

        const file = await fileHandle.getFile()
        const text = await file.text()
        const data = JSON.parse(text) as StoredKlineData

        // 验证数据格式
        if (
          data.timeframe &&
          Array.isArray(data.candles) &&
          data.lastUpdated
        ) {
          allCandles.push(...data.candles)
          if (!latestUpdate || data.lastUpdated > latestUpdate) {
            latestUpdate = data.lastUpdated
          }
        }
      } catch (error) {
        console.warn(`Failed to read kline data file ${filename}:`, error)
        // 继续读取其他年份的文件
      }
    }

    if (allCandles.length === 0) {
      return null
    }

    // 去重并按时间排序
    const candleMap = new Map<number, KlineCandle>()
    allCandles.forEach((candle) => {
      const time = typeof candle.time === 'number'
        ? candle.time
        : Date.parse(candle.time as string) / 1000
      candleMap.set(time, candle)
    })

    const sortedCandles = Array.from(candleMap.values()).sort((a, b) => {
      const timeA = typeof a.time === 'number'
        ? a.time
        : Date.parse(a.time as string) / 1000
      const timeB = typeof b.time === 'number'
        ? b.time
        : Date.parse(b.time as string) / 1000
      return timeA - timeB
    })

    return {
      timeframe,
      candles: sortedCandles,
      lastUpdated: latestUpdate || new Date().toISOString(),
    }
  } catch (error) {
    console.error(`Failed to read kline data file for ${timeframe}:`, error)
    return null
  }
}

/**
 * 将 K 线数据写入本地文件（按年）
 * 
 * @param timeframe 时间周期
 * @param candles K 线数据数组
 */
export async function writeKlineDataToFile(
  timeframe: Timeframe,
  candles: KlineCandle[],
  dataSourceId?: string,
): Promise<void> {
  if (!klineDataDirectoryHandle) {
    console.warn('Kline data directory not set, cannot write to file')
    return
  }

  if (candles.length === 0) {
    return
  }

  try {
    // 按年分组数据
    const candlesByYear = new Map<number, KlineCandle[]>()
    
    candles.forEach((candle) => {
      const time = typeof candle.time === 'number'
        ? candle.time
        : Date.parse(candle.time as string) / 1000
      const year = getYearFromTimestamp(time)
      
      if (!candlesByYear.has(year)) {
        candlesByYear.set(year, [])
      }
      candlesByYear.get(year)!.push(candle)
    })

    // 写入每个年份的文件
    const writePromises = Array.from(candlesByYear.entries()).map(
      async ([year, yearCandles]) => {
        const filename = getFilename(timeframe, year, dataSourceId)
        const data: StoredKlineData = {
          timeframe,
          candles: yearCandles.sort((a, b) => {
            const timeA = typeof a.time === 'number'
              ? a.time
              : Date.parse(a.time as string) / 1000
            const timeB = typeof b.time === 'number'
              ? b.time
              : Date.parse(b.time as string) / 1000
            return timeA - timeB
          }),
          lastUpdated: new Date().toISOString(),
        }

        const fileHandle = await klineDataDirectoryHandle!.getFileHandle(filename, {
          create: true,
        })
        const writable = await fileHandle.createWritable()
        await writable.write(JSON.stringify(data, null, 2))
        await writable.close()
      }
    )

    await Promise.all(writePromises)
  } catch (error) {
    console.error(`Failed to write kline data file for ${timeframe}:`, error)
    throw error
  }
}

/**
 * 合并新的 K 线数据到现有文件（按年）
 * 
 * 根据时间戳去重，保留最新的数据
 * 
 * @param timeframe 时间周期
 * @param newCandles 新的 K 线数据
 */
export async function mergeKlineDataToFile(
  timeframe: Timeframe,
  newCandles: KlineCandle[],
  dataSourceId?: string,
): Promise<void> {
  if (newCandles.length === 0) {
    return
  }

  // 确定新数据涉及的年份
  const newTimes = newCandles.map((c) =>
    typeof c.time === 'number' ? c.time : Date.parse(c.time as string) / 1000,
  )
  const minTime = Math.min(...newTimes)
  const maxTime = Math.max(...newTimes)
  const years = getYearsInRange(minTime, maxTime)

  // 读取相关年份的现有数据
  const existingCandles: KlineCandle[] = []
  for (const year of years) {
    const yearStart = Math.floor(Date.UTC(year, 0, 1) / 1000)
    const yearEnd = Math.floor(Date.UTC(year + 1, 0, 1) / 1000) - 1
    const existing = await readKlineDataFromFile(timeframe, yearStart, yearEnd, dataSourceId)
    if (existing) {
      existingCandles.push(...existing.candles)
    }
  }

  // 创建时间戳到数据的映射，用于去重
  const candleMap = new Map<number, KlineCandle>()

  // 先添加现有数据
  existingCandles.forEach((candle) => {
    const time = typeof candle.time === 'number'
      ? candle.time
      : Date.parse(candle.time as string) / 1000
    candleMap.set(time, candle)
  })

  // 添加新数据（会覆盖相同时间戳的数据）
  newCandles.forEach((candle) => {
    const time = typeof candle.time === 'number'
      ? candle.time
      : Date.parse(candle.time as string) / 1000
    candleMap.set(time, candle)
  })

  // 转换为数组并按时间排序
  const merged = Array.from(candleMap.values()).sort((a, b) => {
    const timeA = typeof a.time === 'number'
      ? a.time
      : Date.parse(a.time as string) / 1000
    const timeB = typeof b.time === 'number'
      ? b.time
      : Date.parse(b.time as string) / 1000
    return timeA - timeB
  })

  await writeKlineDataToFile(timeframe, merged, dataSourceId)
}

/**
 * 清除指定时间周期的 K 线数据文件
 * 
 * 清除所有年份的文件，以及旧格式的文件（向后兼容）
 * 
 * @param timeframe 时间周期
 */
export async function clearKlineDataFile(
  timeframe: Timeframe,
  dataSourceId?: string,
): Promise<void> {
  if (!klineDataDirectoryHandle) {
    return
  }

  try {
    // 清除旧格式文件（向后兼容）
    const oldFilename = `kline_${timeframe}.json`
    await klineDataDirectoryHandle.removeEntry(oldFilename).catch(() => {
      // 文件不存在时忽略错误
    })

    // 清除所有年份的文件（2000-2100）
    const clearPromises: Promise<void>[] = []
    for (let year = 2000; year <= 2100; year++) {
      const filename = getFilename(timeframe, year, dataSourceId)
      clearPromises.push(
        klineDataDirectoryHandle.removeEntry(filename).catch(() => {
          // 文件不存在时忽略错误
        })
      )
    }
    await Promise.all(clearPromises)
  } catch (error) {
    console.error(`Failed to clear kline data file for ${timeframe}:`, error)
  }
}


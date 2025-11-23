import type { KlineQueryParams, KlineDataResponse } from './types'

/**
 * 数据源标识符
 * 格式：{source}-{symbol}，例如 'binance-btc', 'binance-eth', 'coinglass-sol'
 */
export type DataSourceId = string

/**
 * 解析数据源标识符
 */
export function parseDataSourceId(id: DataSourceId): {
  source: string
  symbol: string
} {
  const parts = id.split('-')
  if (parts.length < 2) {
    throw new Error(`Invalid data source ID format: ${id}. Expected format: source-symbol`)
  }
  const source = parts[0]
  const symbol = parts.slice(1).join('-').toUpperCase() // 支持多段符号，如 'BTC-USDT'
  return { source, symbol }
}

/**
 * 构建数据源标识符
 */
export function buildDataSourceId(source: string, symbol: string): DataSourceId {
  return `${source.toLowerCase()}-${symbol.toLowerCase()}`
}

/**
 * 数据源接口
 */
export interface KlineDataSource {
  /**
   * 数据源名称
   */
  name: string

  /**
   * 获取 K 线数据
   */
  fetchKlineData(params: KlineQueryParams & { symbol: string }): Promise<KlineDataResponse>
}

/**
 * 数据源注册表
 */
const dataSourceRegistry = new Map<string, KlineDataSource>()

/**
 * 注册数据源
 */
export function registerDataSource(source: string, dataSource: KlineDataSource): void {
  dataSourceRegistry.set(source.toLowerCase(), dataSource)
}

/**
 * 获取数据源
 */
export function getDataSource(source: string): KlineDataSource | null {
  return dataSourceRegistry.get(source.toLowerCase()) || null
}

/**
 * 根据数据源 ID 获取数据源并获取 K 线数据
 */
export async function fetchKlineDataBySource(
  dataSourceId: DataSourceId,
  params: KlineQueryParams,
): Promise<KlineDataResponse> {
  const { source, symbol } = parseDataSourceId(dataSourceId)
  const dataSource = getDataSource(source)
  
  if (!dataSource) {
    throw new Error(`Unknown data source: ${source}. Available sources: ${Array.from(dataSourceRegistry.keys()).join(', ')}`)
  }

  return dataSource.fetchKlineData({
    ...params,
    symbol,
  })
}

/**
 * 获取可用的数据源选项
 * 从数据源配置中动态生成，只包含已启用的数据源
 * 注意：调用此函数前需要确保已导入 './sources' 模块
 */
export function getSourceOptions(): Array<{ label: string; value: string }> {
  // 从全局获取已加载的 sources 模块
  if (typeof window !== 'undefined' && (window as any).__klineDataSources) {
    const sourcesModule = (window as any).__klineDataSources
    if (typeof sourcesModule.getEnabledDataSourceOptions === 'function') {
      return sourcesModule.getEnabledDataSourceOptions()
    }
  }
  
  // 如果 sources 模块还未加载，返回默认值
  // 实际使用中，应该在应用入口处导入 './sources'
  return [{ label: 'Binance', value: 'binance' }]
}

/**
 * 可用的标的选项
 * 注意：不同数据源可能支持不同的标的，这里列出通用的
 */
export const SYMBOL_OPTIONS = [
  { label: 'BTC', value: 'btc' },
  { label: 'ETH', value: 'eth' },
  { label: 'SOL', value: 'sol' },
] as const


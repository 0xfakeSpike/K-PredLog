/**
 * 数据源模块统一导出
 * 所有数据源实现都应该在这里导入，以确保它们被注册
 */

// 导入 Binance 数据源（会自动注册）
import './binance'

// 将模块导出到全局，供 dataSource.ts 使用（避免循环依赖）
if (typeof window !== 'undefined') {
  (window as any).__klineDataSources = {
    getEnabledDataSourceOptions,
  }
}

// 未来可以在这里导入其他数据源
// import './coinglass'
// import './okx'

/**
 * 数据源类型枚举
 * 集中管理所有可用的数据源
 */
export type DataSourceType = 'binance' | 'coinglass' | 'okx'

/**
 * 数据源配置
 * 定义每个数据源的显示名称和是否可用
 */
export interface DataSourceConfig {
  type: DataSourceType
  label: string
  enabled: boolean
  description?: string
}

/**
 * 所有数据源的配置
 */
export const DATA_SOURCE_CONFIGS: Record<DataSourceType, DataSourceConfig> = {
  binance: {
    type: 'binance',
    label: 'Binance',
    enabled: true,
    description: '币安交易所',
  },
  coinglass: {
    type: 'coinglass',
    label: 'CoinGlass',
    enabled: false, // 暂未实现
    description: 'CoinGlass 数据平台',
  },
  okx: {
    type: 'okx',
    label: 'OKX',
    enabled: false, // 暂未实现
    description: 'OKX 交易所',
  },
}

/**
 * 获取所有已启用的数据源选项
 */
export function getEnabledDataSourceOptions() {
  return Object.values(DATA_SOURCE_CONFIGS)
    .filter((config) => config.enabled)
    .map((config) => ({
      label: config.label,
      value: config.type,
    }))
}


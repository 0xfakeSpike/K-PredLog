/**
 * 笔记相关的选项配置
 * 由笔记模块维护
 */

/**
 * 预测方向选项
 */
export const DIRECTION_OPTIONS = [
  { label: '看多 (long)', value: 'long' },
  { label: '看空 (short)', value: 'short' },
  { label: '震荡 (range)', value: 'range' },
] as const

/**
 * 预测周期选项（秒数）
 */
export const INTERVAL_OPTIONS = [
  { label: '1天', value: 1 * 24 * 60 * 60 }, // 86400
  { label: '3天', value: 3 * 24 * 60 * 60 }, // 259200
  { label: '1周', value: 7 * 24 * 60 * 60 }, // 604800
  { label: '2周', value: 14 * 24 * 60 * 60 }, // 1209600
  { label: '1个月', value: 30 * 24 * 60 * 60 }, // 2592000
  { label: '3个月', value: 90 * 24 * 60 * 60 }, // 7776000
  { label: '6个月', value: 180 * 24 * 60 * 60 }, // 15552000
] as const


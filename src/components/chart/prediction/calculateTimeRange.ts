/**
 * 预测标记模块：时间范围计算
 * 负责根据笔记的预测信息计算需要显示的K线数据时间范围
 * 这是预测标记模块的职责，与K线数据获取模块分离
 */

import type { Timeframe } from '../../../klineData/types'
import { TIMEFRAME_BEFORE_DAYS, TIMEFRAME_DEFAULT_DAYS } from '../../../klineData/types'
import type { Note } from '../../../noteStore/note/types'

/**
 * 根据笔记时间计算时间范围
 * 考虑笔记的预测周期（interval），确保覆盖预测的终点
 * 
 * 这是预测标记模块的职责，因为需要理解笔记的预测语义
 */
export function calculateTimeRangeFromNote(
  note: Note,
  timeframe: Timeframe,
): { startTime: number; endTime: number } | null {
  // name 是 YYYY-MM-DD 格式，解析为时间戳（秒）
  const noteTime = Math.floor(Date.parse(note.name) / 1000)

  // interval 已经是秒数
  const actualIntervalSeconds = note.interval
  
  // 计算时间范围：
  // - 起点：笔记时间往前一些（用于显示历史背景），根据时间周期调整
  // - 终点：笔记时间 + 预测周期 + 一些缓冲（确保覆盖预测终点）
  const beforeDays = TIMEFRAME_BEFORE_DAYS[timeframe]
  const startTime = noteTime - beforeDays * 24 * 60 * 60
  
  // 终点 = 笔记时间 + 预测周期 + 缓冲（预测周期的 20%，至少 7 天）
  const bufferSeconds = Math.max(actualIntervalSeconds * 0.2, 7 * 24 * 60 * 60)
  const endTime = noteTime + actualIntervalSeconds + bufferSeconds

  return { startTime, endTime }
}

/**
 * 当没有选中笔记时的默认时间范围
 * 以当前时间为终点，向前取不同时间周期对应的默认天数
 */
export function calculateDefaultTimeRange(
  timeframe: Timeframe,
): { startTime: number; endTime: number } {
  const nowSeconds = Math.floor(Date.now() / 1000)
  const defaultDays = TIMEFRAME_DEFAULT_DAYS[timeframe]
  const windowSeconds = defaultDays * 24 * 60 * 60
  return {
    startTime: nowSeconds - windowSeconds,
    endTime: nowSeconds,
  }
}


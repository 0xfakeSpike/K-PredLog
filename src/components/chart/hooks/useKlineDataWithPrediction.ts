/**
 * 结合预测标记的K线数据 Hook
 * 
 * 这是预测标记模块提供的 Hook，它：
 * 1. 根据笔记计算时间范围（预测标记模块的职责）
 * 2. 调用 useKlineData 获取K线数据（K线模块的职责）
 * 
 * 这样实现了两个模块的分离：
 * - K线模块：只负责数据获取，不关心笔记
 * - 预测标记模块：负责根据笔记计算时间范围
 */

import { useMemo } from 'react'
import type { Timeframe } from '../../../klineData/types'
import type { Note } from '../../../noteStore/note/types'
import { useKlineData } from './useKlineData'
import { calculateTimeRangeFromNote } from '../prediction/calculateTimeRange'
import { useNoteConfigContext } from '../../../noteStore/hooks/useNoteConfigContext'

/**
 * 根据笔记和预测信息获取K线数据
 * 
 * @param timeframe 时间周期
 * @param activeNote 激活的笔记（可选）
 */
export function useKlineDataWithPrediction(
  timeframe: Timeframe,
  activeNote?: Note | null,
) {
  const { noteConfig } = useNoteConfigContext()
  
  // 使用 useMemo 稳定 timeRange 对象引用
  // 只有当笔记的关键属性（name、interval）或 timeframe 变化时，才重新计算
  // 这样可以避免因为 activeNote 对象引用变化（但内容相同）导致 useKlineData 重新执行
  const timeRange = useMemo(() => {
    if (!activeNote) return null
    return calculateTimeRangeFromNote(activeNote, timeframe)
  }, [activeNote?.name, activeNote?.interval, timeframe])

  // 调用K线数据获取模块（K线模块的职责）
  return useKlineData(timeframe, timeRange, noteConfig)
}


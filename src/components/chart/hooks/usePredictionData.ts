import { useMemo } from 'react'
import type { SeriesMarker, Time, CandlestickData } from 'lightweight-charts'
import type { Note } from '../../../noteStore/note/types'
import { buildNoteMarkers } from '../prediction/marker/buildMarkers'
import { transformNoteMarkers } from '../prediction/marker/transformMarkers'
import { buildPredictionSegments } from '../prediction/segment/buildSegments'
import { toNumberTime } from '../shared/utils'

/**
 * 预测数据转换 Hook
 * 
 * 职责：将原始笔记数据和K线数据转换为图表所需的格式
 * - 将 Note[] 转换为 NoteMarker[]
 * - 将 NoteMarker[] 转换为 SeriesMarker[]
 * - 构建预测线段数据
 * - 计算激活标记时间
 * 
 * 这样可以将数据转换逻辑从 KlineManager 中分离出来，
 * 使 KlineManager 专注于组件协调和UI控制
 */
export function usePredictionData(
  notes: Note[],
  candles: CandlestickData<Time>[],
  activeNote?: Note | null,
) {
  // 构建 noteMarkers（从 notes 转换为图表标记）
  const noteMarkers = useMemo(
    () => buildNoteMarkers(notes),
    [notes],
  )

  // 转换预测标记为图表格式
  const chartMarkers = useMemo<SeriesMarker<Time>[]>(() => {
    if (!candles.length) return []
    const derived = transformNoteMarkers(noteMarkers, candles)
    return derived.sort((a, b) => toNumberTime(a.time) - toNumberTime(b.time))
  }, [noteMarkers, candles])

  // 找到当前激活笔记对应的标记时间（用于聚焦）
  const activeMarkerTime = useMemo(() => {
    const marker = noteMarkers.find((marker) => marker.noteName === activeNote?.name)
    return marker?.time
  }, [noteMarkers, activeNote?.name])

  // 构建预测线段
  const predictionSegments = useMemo(
    () => buildPredictionSegments(noteMarkers, candles),
    [noteMarkers, candles],
  )

  return {
    noteMarkers,
    chartMarkers,
    predictionSegments,
    activeMarkerTime,
  }
}


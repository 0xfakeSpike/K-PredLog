import type { JSONContent } from '@tiptap/core'

/**
 * 笔记名称类型（YYYY-MM-DD 格式的日期，如：2025-11-23）
 */
export type NoteName = string

/**
 * 笔记数据结构
 * 由笔记模块维护和定义
 */
export interface Note {
  name: NoteName // YYYY-MM-DD 格式的日期（如：2025-11-23）
  direction: string
  interval: number // 预测周期（秒数）
  content: JSONContent
}

/**
 * 笔记标记类型
 * 用于在 K 线图上显示笔记的预测信息
 */
export type NoteMarker = {
  time: number
  directionLabel: string
  intervalLabel: string
  noteName: NoteName
  color: string
  position: 'aboveBar' | 'belowBar'
  shape: 'arrowUp' | 'arrowDown' | 'circle'
}


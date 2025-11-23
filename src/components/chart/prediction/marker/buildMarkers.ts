import type { Note, NoteMarker } from '../../../../noteStore/note/types'

/**
 * 构建笔记标记数组（用于在 K 线图上显示）
 * 将 Note[] 转换为 NoteMarker[]
 */
export function buildNoteMarkers(notes: Note[]): NoteMarker[] {
  const mapped = notes
    .map((note) => {
      // name 是 YYYY-MM-DD 格式，解析为时间戳
      const time = Date.parse(note.name)

      // 将秒数转换为天数用于显示
      const intervalDays = Math.round(note.interval / (24 * 60 * 60))
      const intervalLabel = String(intervalDays)

      const { color, position, shape } = getMarkerVisuals(note.direction)
      return {
        time: Math.floor(time / 1000),
        directionLabel: note.direction,
        intervalLabel,
        noteName: note.name,
        color,
        position,
        shape,
      } as NoteMarker
    })

  return mapped.sort((a, b) => a.time - b.time)
}

/**
 * 根据方向获取标记的视觉效果
 */
function getMarkerVisuals(direction: string): {
  color: string
  position: 'aboveBar' | 'belowBar'
  shape: 'arrowUp' | 'arrowDown' | 'circle'
} {
  const normalized = direction.toLowerCase()
  switch (normalized) {
    case 'long':
    case '多':
    case 'bull':
      return {
        color: '#22c55e',
        position: 'belowBar',
        shape: 'arrowUp' as const,
      }
    case 'short':
    case '空':
    case 'bear':
      return {
        color: '#ef4444',
        position: 'aboveBar',
        shape: 'arrowDown' as const,
      }
    case 'range':
    case '震荡':
    case 'neutral':
      return {
        color: '#f97316',
        position: 'aboveBar',
        shape: 'circle' as const,
      }
  }
  throw new Error(`Unknown direction: ${direction}`)
}


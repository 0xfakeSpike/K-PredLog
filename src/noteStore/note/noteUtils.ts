/**
 * 笔记工具函数
 */

/**
 * 标准化方向标签
 * 将各种方向标签（包括中文）转换为标准格式：'long' | 'short' | 'range'
 */
export function normalizeDirection(direction: string): 'long' | 'short' | 'range' | null {
  const normalized = direction.toLowerCase()
  switch (normalized) {
    case 'long':
    case '多':
    case 'bull':
      return 'long'
    case 'short':
    case '空':
    case 'bear':
      return 'short'
    case 'range':
    case '震荡':
    case 'neutral':
      return 'range'
    default:
      return null
  }
}


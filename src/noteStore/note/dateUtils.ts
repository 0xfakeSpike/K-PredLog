/**
 * 日期工具函数
 * 统一使用 YYYY-MM-DD 格式（如：2025-11-23）
 * 文件名和 Note.name 都使用此格式
 */

/**
 * 获取今天的日期（YYYY-MM-DD 格式）
 */
export function getTodayName(): string {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(now.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 验证日期字符串是否为有效的 YYYY-MM-DD 格式
 */
export function isValidDateString(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false
  }
  
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    !Number.isNaN(date.getTime())
  )
}


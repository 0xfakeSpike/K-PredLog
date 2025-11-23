/**
 * 笔记内容工具函数
 * 用于从笔记内容中提取信息
 */

import type { JSONContent } from '@tiptap/core'

/**
 * 从 JSONContent 中提取文本内容
 */
function extractTextFromNode(node: JSONContent): string {
  if (node.type === 'text') {
    return node.text || ''
  }
  
  if (node.content && Array.isArray(node.content)) {
    return node.content.map(extractTextFromNode).join('')
  }
  
  return ''
}

/**
 * 从笔记内容中提取所有文本（用于搜索）
 */
export function extractAllTextFromContent(content: JSONContent): string {
  return extractTextFromNode(content)
}

/**
 * 从笔记内容中提取第一行作为标题
 * 优先查找第一个 heading，如果没有则查找第一个 paragraph
 */
export function extractTitleFromContent(content: JSONContent): string {
  if (!content.content || !Array.isArray(content.content)) {
    return '无标题'
  }

  // 首先查找第一个 heading
  for (const node of content.content) {
    if (node.type === 'heading') {
      const text = extractTextFromNode(node)
      if (text.trim()) {
        return text.trim()
      }
    }
  }

  // 如果没有 heading，查找第一个 paragraph
  for (const node of content.content) {
    if (node.type === 'paragraph') {
      const text = extractTextFromNode(node)
      if (text.trim()) {
        return text.trim()
      }
    }
  }

  // 如果都没有，查找任何包含文本的节点
  for (const node of content.content) {
    const text = extractTextFromNode(node)
    if (text.trim()) {
      return text.trim()
    }
  }

  return '无标题'
}


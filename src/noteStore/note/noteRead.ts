/**
 * 笔记读取模块
 * 负责从文件系统读取笔记文件并解析为 Note 对象
 */

import { generateJSON } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import { marked } from 'marked'
import type { JSONContent } from '@tiptap/core'
import type { Note } from './types'
import { getTodayName, isValidDateString } from './dateUtils'

interface FrontMatter {
  direction?: string
  interval?: string
}

/**
 * 从文件系统目录加载所有笔记文件
 */
export async function loadNotesFromDirectory(
  handle: FileSystemDirectoryHandle,
): Promise<Note[]> {
  const notes: Note[] = []
  for await (const [name, entry] of handle.entries()) {
    if (entry.kind !== 'file' || !name.endsWith('.md')) continue
    const fileHandle = entry as FileSystemFileHandle
    const file = await fileHandle.getFile()
    const text = await file.text()
    notes.push(parseMarkdownFile(`${handle.name}/${name}`, text))
  }
  return notes
}

/**
 * 解析 Markdown 文件为 Note 对象
 * 
 * @param path 文件路径
 * @param raw 文件原始内容
 */
export function parseMarkdownFile(path: string, raw: string): Note {
  // 从文件名获取日期（YYYY-MM-DD 格式）
  const pathParts = path.split('/')
  const filename = pathParts[pathParts.length - 1]
  const nameFromFile = filename.replace(/\.md$/, '')
  
  // 验证文件名是否是有效的 YYYY-MM-DD 格式
  // 如果是，直接使用；否则使用今天的日期
  const name = isValidDateString(nameFromFile) 
    ? nameFromFile 
    : getTodayName()
  
  // 1. 读取被下划线分割出来的 JSON 数据
  const { frontMatter, body } = splitFrontMatter(raw)
  
  // 2. 读取正文并转换为 JSONContent（用于编辑器）
  const html = marked.parse(body, { async: false }) as string
  const content = generateJSON(html, [StarterKit]) as JSONContent

  // 读取时：文件中的天数 → Note 中的秒数
  const intervalDays = frontMatter.interval || '1'
  const intervalSeconds = Number(intervalDays) * 24 * 60 * 60

  return {
    name,
    direction: frontMatter.direction || 'neutral',
    interval: intervalSeconds,
    content,
  }
}

/**
 * 分割 front matter 和正文
 * 支持格式：---\n{...}\n---\n\n正文
 */
function splitFrontMatter(raw: string): {
  frontMatter: FrontMatter
  body: string
} {
  const match = raw.match(/^---\n([\s\S]+?)\n---\n\n?([\s\S]*)$/)
  if (!match) {
    return { frontMatter: {}, body: raw }
  }
  
  const [, jsonBlock, body] = match
  let frontMatter: FrontMatter = {}
  
  try {
    frontMatter = JSON.parse(jsonBlock.trim()) as FrontMatter
  } catch (error) {
    console.warn('Failed to parse front matter JSON:', error)
  }
  
  return { frontMatter, body: body.trim() }
}


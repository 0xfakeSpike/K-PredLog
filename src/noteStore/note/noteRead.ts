/**
 * 笔记读取模块
 * 负责从文件系统读取笔记文件并解析为 Note 对象
 * 
 * 新逻辑：
 * - JSON 文件（如 2025-11-26.json）存储结构化信息：direction, score, interval, reason
 * - MD 文件（如 2025-11-26.md）存储笔记内容
 */

import { generateJSON } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import { marked } from 'marked'
import type { JSONContent } from '@tiptap/core'
import type { Note } from './types'
import { getTodayName, isValidDateString } from './dateUtils'

interface NoteJsonData {
  direction?: string
  score?: number
  interval?: number // 天数
  reason?: string
}

/**
 * 从文件系统目录加载所有笔记文件
 * 会同时读取 JSON 和 MD 文件
 */
export async function loadNotesFromDirectory(
  handle: FileSystemDirectoryHandle,
): Promise<Note[]> {
  const notes: Note[] = []
  const processedNames = new Set<string>()
  
  // 遍历所有文件
  for await (const [name, entry] of handle.entries()) {
    if (entry.kind !== 'file') continue
    
    // 处理 MD 文件
    if (name.endsWith('.md')) {
      const noteName = name.replace(/\.md$/, '')
      if (processedNames.has(noteName)) continue
      processedNames.add(noteName)
      
      try {
        // 读取 MD 文件
        const mdFileHandle = entry as FileSystemFileHandle
        const mdFile = await mdFileHandle.getFile()
        const mdText = await mdFile.text()
        
        // 尝试读取对应的 JSON 文件
        let jsonData: NoteJsonData = {}
        try {
          const jsonFileHandle = await handle.getFileHandle(`${noteName}.json`)
          const jsonFile = await jsonFileHandle.getFile()
          const jsonText = await jsonFile.text()
          jsonData = JSON.parse(jsonText) as NoteJsonData
        } catch (error) {
          // JSON 文件不存在或解析失败，使用默认值
          console.warn(`Failed to read JSON file for ${noteName}:`, error)
        }
        
        const note = parseNoteFiles(noteName, jsonData, mdText)
        notes.push(note)
      } catch (error) {
        console.warn(`Failed to load note ${name}:`, error)
      }
    }
  }
  
  return notes
}

/**
 * 解析笔记文件为 Note 对象
 * 
 * @param noteName 笔记名称（YYYY-MM-DD 格式）
 * @param jsonData JSON 文件中的数据
 * @param mdText MD 文件的原始内容
 */
export function parseNoteFiles(
  noteName: string,
  jsonData: NoteJsonData,
  mdText: string,
): Note {
  // 验证笔记名称是否是有效的 YYYY-MM-DD 格式
  // 如果是，直接使用；否则使用今天的日期
  const name = isValidDateString(noteName) 
    ? noteName 
    : getTodayName()
  
  // 读取 MD 文件内容并转换为 JSONContent（用于编辑器）
  // 如果 MD 文件包含 front matter，需要先移除
  const { body } = splitFrontMatterIfExists(mdText)
  const html = marked.parse(body, { async: false }) as string
  const content = generateJSON(html, [StarterKit]) as JSONContent

  // 读取时：JSON 文件中的天数 → Note 中的秒数
  const intervalDays = jsonData.interval ?? 1
  const intervalSeconds = intervalDays * 24 * 60 * 60

  return {
    name,
    direction: jsonData.direction || 'neutral',
    score: jsonData.score ?? 0,
    interval: intervalSeconds,
    reason: jsonData.reason || '',
    content,
  }
}

/**
 * 兼容旧格式：如果 MD 文件包含 front matter，先移除它
 * 支持格式：---\n{...}\n---\n\n正文
 */
function splitFrontMatterIfExists(raw: string): {
  body: string
} {
  const match = raw.match(/^---\n([\s\S]+?)\n---\n\n?([\s\S]*)$/)
  if (!match) {
    return { body: raw }
  }
  
  const [, , body] = match
  return { body: body.trim() }
}

/**
 * 解析 Markdown 文件为 Note 对象（兼容旧格式，用于向后兼容）
 * 
 * @param path 文件路径
 * @param raw 文件原始内容
 * @deprecated 使用 parseNoteFiles 代替
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
  
  // 尝试解析 front matter（旧格式）
  const { frontMatter, body } = splitFrontMatter(raw)
  
  // 读取正文并转换为 JSONContent（用于编辑器）
  const html = marked.parse(body, { async: false }) as string
  const content = generateJSON(html, [StarterKit]) as JSONContent

  // 读取时：文件中的天数 → Note 中的秒数
  const intervalDays = frontMatter.interval || '1'
  const intervalSeconds = Number(intervalDays) * 24 * 60 * 60

  return {
    name,
    direction: frontMatter.direction || 'neutral',
    score: 0, // 旧格式没有 score，使用默认值
    interval: intervalSeconds,
    reason: '', // 旧格式没有 reason，使用默认值
    content,
  }
}

/**
 * 分割 front matter 和正文（兼容旧格式）
 * 支持格式：---\n{...}\n---\n\n正文
 */
function splitFrontMatter(raw: string): {
  frontMatter: { direction?: string; interval?: string }
  body: string
} {
  const match = raw.match(/^---\n([\s\S]+?)\n---\n\n?([\s\S]*)$/)
  if (!match) {
    return { frontMatter: {}, body: raw }
  }
  
  const [, jsonBlock, body] = match
  let frontMatter: { direction?: string; interval?: string } = {}
  
  try {
    frontMatter = JSON.parse(jsonBlock.trim()) as { direction?: string; interval?: string }
  } catch (error) {
    console.warn('Failed to parse front matter JSON:', error)
  }
  
  return { frontMatter, body: body.trim() }
}


/**
 * 笔记写入模块
 * 负责将 Note 对象写入文件系统
 * 
 * 新逻辑：
 * - JSON 文件（如 2025-11-26.json）存储结构化信息：direction, score, interval, reason
 * - MD 文件（如 2025-11-26.md）存储笔记内容
 */

import { generateHTML } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import TurndownService from 'turndown'
import type { Note } from './types'

const turndown = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
})

/**
 * 将 Note 对象写入文件系统
 * 会同时创建/更新 JSON 文件和 MD 文件
 * 
 * @param note 笔记对象
 * @param directoryHandle 文件系统目录句柄
 */
export async function writeNote(
  note: Note,
  directoryHandle: FileSystemDirectoryHandle,
): Promise<void> {
  // 写入 JSON 文件（结构化信息）
  await writeNoteJson(note, directoryHandle)
  
  // 写入 MD 文件（笔记内容）
  await writeNoteMarkdown(note, directoryHandle)
}

/**
 * 写入 JSON 文件（结构化信息）
 */
async function writeNoteJson(
  note: Note,
  directoryHandle: FileSystemDirectoryHandle,
): Promise<void> {
  const filename = `${note.name}.json`
  const fileHandle = await directoryHandle.getFileHandle(filename, { create: true })
  const writable = await fileHandle.createWritable()
  
  // 写入时：Note 中的秒数 → JSON 文件中的天数
  const intervalDays = Math.round(note.interval / (24 * 60 * 60))
  
  const jsonData = {
    direction: note.direction,
    score: note.score,
    interval: intervalDays,
    reason: note.reason,
  }
  
  const jsonString = JSON.stringify(jsonData, null, 2)
  await writable.write(jsonString)
  await writable.close()
}

/**
 * 写入 MD 文件（笔记内容）
 */
async function writeNoteMarkdown(
  note: Note,
  directoryHandle: FileSystemDirectoryHandle,
): Promise<void> {
  const filename = `${note.name}.md`
  const fileHandle = await directoryHandle.getFileHandle(filename, { create: true })
  const writable = await fileHandle.createWritable()
  
  const markdown = serializeNoteToMarkdown(note)
  await writable.write(markdown)
  await writable.close()
}

/**
 * 将 Note 对象序列化为 Markdown 格式
 * 注意：不再包含 front matter，只包含内容
 * 
 * @param note 笔记对象
 * @returns Markdown 格式的字符串
 */
export function serializeNoteToMarkdown(note: Note): string {
  const html = generateHTML(note.content, [StarterKit])
  const markdownBody = turndown.turndown(html)
  return markdownBody.trim() + '\n'
}


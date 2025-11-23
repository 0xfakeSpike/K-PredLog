/**
 * 笔记写入模块
 * 负责将 Note 对象写入文件系统
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
 * 
 * @param note 笔记对象
 * @param directoryHandle 文件系统目录句柄
 */
export async function writeNote(
  note: Note,
  directoryHandle: FileSystemDirectoryHandle,
): Promise<void> {
  // 直接使用 note.name 作为文件名（已经是 YYYY-MM-DD 格式）
  const filename = `${note.name}.md`
  const fileHandle = await directoryHandle.getFileHandle(filename, { create: true })
  const writable = await fileHandle.createWritable()
  const markdown = serializeNoteToMarkdown(note)
  await writable.write(markdown)
  await writable.close()
}

/**
 * 将 Note 对象序列化为 Markdown 格式
 * 
 * @param note 笔记对象
 * @returns Markdown 格式的字符串
 */
export function serializeNoteToMarkdown(note: Note): string {
  const frontMatter = buildFrontMatter(note)
  const html = generateHTML(note.content, [StarterKit])
  const markdownBody = turndown.turndown(html)
  return `---\n${frontMatter}\n---\n\n${markdownBody.trim()}\n`
}

/**
 * 构建 front matter JSON 字符串
 */
function buildFrontMatter(note: Note): string {
  // 写入时：Note 中的秒数 → 文件中的天数
  const intervalDays = String(Math.round(note.interval / (24 * 60 * 60)))
  
  const payload = {
    direction: note.direction,
    interval: intervalDays,
  }
  return JSON.stringify(payload, null, 2)
}


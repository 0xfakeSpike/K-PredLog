/**
 * 笔记列表管理 Hook
 * 负责笔记列表的增删改查、搜索、文件夹选择等操作
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import type { Note, NoteName } from '../note/types'
import { loadNotesFromDirectory, parseMarkdownFile } from '../note/noteRead'
import { writeNote } from '../note/noteWrite'
import { getTodayName, isValidDateString } from '../note/dateUtils'
import { extractAllTextFromContent } from '../note/contentUtils'
import { DEFAULT_CONTENT } from '../note/noteDefaults'
import { setKlineDataDirectory } from '../../klineData/storage'

export interface UseNoteListManagerReturn {
  // 状态
  notes: Note[]
  allNotes: Note[] // 未过滤的完整列表
  activeNoteName: NoteName | null
  searchTerm: string
  sourceFolderName: string | null
  isLoading: boolean
  loadError: string | null
  
  // 操作
  setSearchTerm: (term: string) => void
  setLoadError: (error: string | null) => void
  setNotes: (notes: Note[]) => void
  updateNote: (name: NoteName, patch: Partial<Note>) => void
  createNote: () => Promise<void>
  deleteNote: (name: NoteName) => void
  selectNote: (name: NoteName) => void
  renameNote: (oldName: NoteName, newName: NoteName) => Promise<void>
  
  // 内部方法（供其他hooks使用）
  getDirectoryHandle: () => FileSystemDirectoryHandle | null
  loadNotesFromDirectoryHandle: (handle: FileSystemDirectoryHandle) => Promise<void>
}

/**
 * 创建笔记实体
 */
function createNoteEntity({ content }: { content: typeof DEFAULT_CONTENT }): Note {
  const todayName = getTodayName()
  return {
    name: todayName,
    direction: 'neutral',
    interval: 1 * 24 * 60 * 60, // 默认 1 天（秒数）
    content,
  }
}

/**
 * 过滤笔记（根据搜索词）
 */
function filterNotes(notes: Note[], term: string): Note[] {
  if (!term.trim()) return notes
  const lower = term.toLowerCase()
  return notes.filter((note) => {
    const nameMatch = note.name.toLowerCase().includes(lower)
    const contentText = extractAllTextFromContent(note.content).toLowerCase()
    const contentMatch = contentText.includes(lower)
    return nameMatch || contentMatch
  })
}

/**
 * 按日期降序排序笔记
 */
function sortNotesDescending(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => {
    return b.name.localeCompare(a.name)
  })
}

export function useNoteListManager(): UseNoteListManagerReturn {
  const [notes, setNotes] = useState<Note[]>([])
  const [activeNoteName, setActiveNoteName] = useState<NoteName | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sourceFolderName, setSourceFolderName] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const directoryHandleRef = useRef<FileSystemDirectoryHandle | null>(null)

  const filteredNotes = useMemo(
    () => filterNotes(notes, searchTerm),
    [notes, searchTerm],
  )

  const updateNote = useCallback(
    (name: NoteName, patch: Partial<Note>) => {
      setNotes((prev) =>
        sortNotesDescending(
          prev.map((note) =>
            note.name === name
              ? {
                  ...note,
                  ...patch,
                }
              : note,
          ),
        ),
      )
    },
    [],
  )

  const getDirectoryHandle = useCallback(() => {
    return directoryHandleRef.current
  }, [])

  const loadNotesFromDirectoryHandle = useCallback(
    async (handle: FileSystemDirectoryHandle) => {
      directoryHandleRef.current = handle
      setSourceFolderName(handle.name)

      // 设置 K 线数据存储目录（使用笔记文件夹下的 .kline-data 子文件夹）
      try {
        const klineDataDir = await handle.getDirectoryHandle('.kline-data', {
          create: true,
        })
        setKlineDataDirectory(klineDataDir)
      } catch (error) {
        console.warn('Failed to create kline data directory:', error)
      }

      let rawFileNotes: Note[]
      try {
        rawFileNotes = await loadNotesFromDirectory(handle)
      } catch (error) {
        // 如果加载过程中出现错误（如无效日期），尝试逐个加载并修复
        console.warn('Failed to load some notes, attempting to fix:', error)
        rawFileNotes = []
        for await (const [name, entry] of handle.entries()) {
          if (entry.kind !== 'file' || !name.endsWith('.md')) continue
          try {
            const fileHandle = entry as FileSystemFileHandle
            const file = await fileHandle.getFile()
            const text = await file.text()
            const note = parseMarkdownFile(`${handle.name}/${name}`, text)
            rawFileNotes.push(note)
          } catch (noteError) {
            console.warn(`Failed to load note ${name}, skipping:`, noteError)
          }
        }
      }
      setNotes(sortNotesDescending(rawFileNotes))
      if (rawFileNotes[0]) {
        setActiveNoteName(rawFileNotes[0].name)
      }
    },
    [],
  )

  const createNote = useCallback(async () => {
    const directoryHandle = directoryHandleRef.current
    if (!directoryHandle) {
      setLoadError('请先选择一个笔记文件夹。')
      return
    }

    try {
      setIsLoading(true)

      // 创建笔记实体
      const newNote = createNoteEntity({
        content: DEFAULT_CONTENT,
      })

      // 直接使用 note.name 作为文件名（已经是 YYYY-MM-DD 格式）
      const filename = `${newNote.name}.md`

      // 检查文件是否已存在
      try {
        await directoryHandle.getFileHandle(filename)
        // 文件已存在，提示用户
        setLoadError(`对应日期（${newNote.name}）的笔记已经存在。`)
        setIsLoading(false)
        return
      } catch (error: any) {
        // 文件不存在，继续创建
        if (error.name !== 'NotFoundError') {
          // 其他错误，抛出
          throw error
        }
      }

      // 创建新文件
      await writeNote(newNote, directoryHandle)

      setNotes((prev) => sortNotesDescending([newNote, ...prev]))
      setActiveNoteName(newNote.name)
      setLoadError(null)
    } catch (error) {
      console.error(error)
      setLoadError('创建笔记失败，请检查权限后重试。')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const deleteNote = useCallback(
    (name: NoteName) => {
      setNotes((prev) => {
        const next = prev.filter((item) => item.name !== name)
        if (name === activeNoteName) {
          setActiveNoteName(next.length > 0 ? next[0].name : null)
        }
        return next
      })
    },
    [activeNoteName],
  )

  const selectNote = useCallback((name: NoteName) => {
    setActiveNoteName(name)
  }, [])

  const renameNote = useCallback(
    async (oldName: NoteName, newName: NoteName) => {
      const directoryHandle = directoryHandleRef.current
      if (!directoryHandle) {
        throw new Error('请先选择一个笔记文件夹。')
      }

      // 验证日期格式和有效性（YYYY-MM-DD 格式）
      if (!isValidDateString(newName)) {
        throw new Error('日期格式不正确或日期无效，请输入 YYYY-MM-DD 格式的有效日期（如：2025-11-23）')
      }

      // 查找要重命名的笔记
      const noteToRename = notes.find((note) => note.name === oldName)
      if (!noteToRename) {
        throw new Error(`笔记 ${oldName} 不存在`)
      }

      // 如果名称没有变化，直接返回
      if (oldName === newName) {
        return
      }

      // 检查新文件名是否与其他笔记冲突（排除当前笔记）
      const conflictingNote = notes.find(
        (n) => n.name !== oldName && n.name === newName,
      )
      if (conflictingNote) {
        throw new Error(`对应日期（${newName}）的笔记已经存在`)
      }

      try {
        setIsLoading(true)

        // 创建新名称的笔记对象
        const renamedNote = {
          ...noteToRename,
          name: newName,
        }

        // 写入新文件
        await writeNote(renamedNote, directoryHandle)

        // 删除旧文件
        const oldFilename = `${oldName}.md`
        try {
          await directoryHandle.removeEntry(oldFilename)
        } catch (error: any) {
          // 如果删除失败，尝试回滚（删除新文件）
          try {
            const newFilename = `${newName}.md`
            await directoryHandle.removeEntry(newFilename)
          } catch (rollbackError) {
            console.error('Failed to rollback after rename:', rollbackError)
          }
          throw new Error('删除旧文件失败，请检查权限后重试')
        }

        // 更新笔记列表
        setNotes((prev) =>
          sortNotesDescending(
            prev.map((note) => (note.name === oldName ? renamedNote : note)),
          ),
        )

        // 如果重命名的是当前活动笔记，更新活动笔记名称
        if (activeNoteName === oldName) {
          setActiveNoteName(newName)
        }

        setLoadError(null)
      } catch (error) {
        console.error(error)
        const errorMessage =
          error instanceof Error ? error.message : '重命名笔记失败，请检查权限后重试。'
        setLoadError(errorMessage)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [notes, activeNoteName],
  )

  return {
    notes: filteredNotes,
    allNotes: notes,
    activeNoteName,
    searchTerm,
    sourceFolderName,
    isLoading,
    loadError,
    setSearchTerm,
    setLoadError,
    setNotes,
    updateNote,
    createNote,
    deleteNote,
    selectNote,
    renameNote,
    getDirectoryHandle,
    loadNotesFromDirectoryHandle,
  }
}


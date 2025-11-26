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
import type { DirectoryAccessor, DirectoryHandle } from '../directoryAccessor/types'

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
  getDirectoryAccessor: () => DirectoryAccessor | null
  getDirectoryHandle: () => DirectoryHandle | null
  loadNotesFromDirectoryAccessor: (accessor: DirectoryAccessor) => Promise<void>
}

/**
 * 创建笔记实体
 */
function createNoteEntity({ content }: { content: typeof DEFAULT_CONTENT }): Note {
  const todayName = getTodayName()
  return {
    name: todayName,
    direction: 'neutral',
    score: 0,
    interval: 1 * 24 * 60 * 60, // 默认 1 天（秒数）
    reason: '',
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
  const directoryAccessorRef = useRef<DirectoryAccessor | null>(null)
  const directoryHandleRef = useRef<DirectoryHandle | null>(null)

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

  const getDirectoryAccessor = useCallback(() => {
    return directoryAccessorRef.current
  }, [])

  const getDirectoryHandle = useCallback(() => {
    return directoryHandleRef.current
  }, [])

  const loadNotesFromDirectoryAccessor = useCallback(
    async (accessor: DirectoryAccessor) => {
      directoryAccessorRef.current = accessor
      setSourceFolderName(accessor.name)
      setIsLoading(true)

      try {
        const handle = await accessor.getDirectoryHandle()
        directoryHandleRef.current = handle

        let rawFileNotes: Note[]
        try {
          rawFileNotes = await loadNotesFromDirectory(handle)
        } catch (error) {
          // 如果加载过程中出现错误（如无效日期），尝试逐个加载并修复
          console.warn('Failed to load some notes, attempting to fix:', error)
          rawFileNotes = []
          for await (const [name, entry] of handle.entries()) {
            if (entry instanceof File && !name.endsWith('.md')) continue
            // 检查是否是文件句柄
            if ('getFile' in entry && name.endsWith('.md')) {
              try {
                const file = await entry.getFile()
                const text = await file.text()
                const note = parseMarkdownFile(`${handle.name}/${name}`, text)
                rawFileNotes.push(note)
              } catch (noteError) {
                console.warn(`Failed to load note ${name}, skipping:`, noteError)
              }
            }
          }
        }
        setNotes(sortNotesDescending(rawFileNotes))
        if (rawFileNotes[0]) {
          setActiveNoteName(rawFileNotes[0].name)
        }
        setLoadError(null)
      } catch (error) {
        console.error('Failed to load notes:', error)
        setLoadError(error instanceof Error ? error.message : '加载笔记失败')
      } finally {
        setIsLoading(false)
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
      const mdFilename = `${newNote.name}.md`
      const jsonFilename = `${newNote.name}.json`

      // 检查文件是否已存在（检查 MD 或 JSON 文件）
      let fileExists = false
      try {
        await directoryHandle.getFileHandle(mdFilename)
        fileExists = true
      } catch (error: any) {
        if (error.name !== 'NotFoundError') {
          throw error
        }
      }
      
      if (!fileExists) {
        try {
          await directoryHandle.getFileHandle(jsonFilename)
          fileExists = true
        } catch (error: any) {
          if (error.name !== 'NotFoundError') {
            throw error
          }
        }
      }

      if (fileExists) {
        // 文件已存在，提示用户
        setLoadError(`对应日期（${newNote.name}）的笔记已经存在。`)
        setIsLoading(false)
        return
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

        // 写入新文件（会同时创建 JSON 和 MD 文件）
        await writeNote(renamedNote, directoryHandle)

        // 删除旧文件（JSON 和 MD）
        const oldMdFilename = `${oldName}.md`
        const oldJsonFilename = `${oldName}.json`
        const errors: string[] = []
        
        // 删除旧的 MD 文件
        try {
          await directoryHandle.removeEntry(oldMdFilename)
        } catch (error: any) {
          if (error.name !== 'NotFoundError') {
            errors.push(`删除旧 MD 文件失败: ${error.message}`)
          }
        }
        
        // 删除旧的 JSON 文件
        try {
          await directoryHandle.removeEntry(oldJsonFilename)
        } catch (error: any) {
          if (error.name !== 'NotFoundError') {
            errors.push(`删除旧 JSON 文件失败: ${error.message}`)
          }
        }
        
        // 如果删除失败，尝试回滚（删除新文件）
        if (errors.length > 0) {
          try {
            const newMdFilename = `${newName}.md`
            const newJsonFilename = `${newName}.json`
            await directoryHandle.removeEntry(newMdFilename).catch(() => {})
            await directoryHandle.removeEntry(newJsonFilename).catch(() => {})
          } catch (rollbackError) {
            console.error('Failed to rollback after rename:', rollbackError)
          }
          throw new Error(`删除旧文件失败: ${errors.join('; ')}`)
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
    getDirectoryAccessor,
    getDirectoryHandle,
    loadNotesFromDirectoryAccessor,
  }
}


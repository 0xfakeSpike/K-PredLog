/**
 * 单个笔记管理 Hook
 * 负责单个笔记的读写、更新、删除、脏标记和自动保存
 */

import { useCallback, useEffect, useState } from 'react'
import type { Note, NoteName } from '../note/types'
import { writeNote } from '../note/noteWrite'
import type { DirectoryHandle } from '../directoryAccessor/types'

export interface UseNoteManagerReturn {
  // 状态
  dirtyNoteNames: Set<NoteName>

  // 操作
  updateNote: (name: NoteName, patch: Partial<Note>) => void
  saveNoteToFolder: (
    name: NoteName,
    options?: { silent?: boolean },
  ) => Promise<void>
  markNoteDirty: (name: NoteName) => void
  clearDirtyNote: (name: NoteName) => void
  flushDirtyNote: (noteName: NoteName | null) => void
}

export function useNoteManager(
  notes: Note[],
  updateNote: (name: NoteName, patch: Partial<Note>) => void,
  getDirectoryHandle: () => DirectoryHandle | null,
  setIsLoading?: (loading: boolean) => void,
  setLoadError?: (error: string | null) => void,
): UseNoteManagerReturn {
  const [dirtyNoteNames, setDirtyNoteNames] = useState<Set<NoteName>>(new Set())

  const markNoteDirty = useCallback((name: NoteName) => {
    setDirtyNoteNames((prev) => {
      const next = new Set(prev)
      next.add(name)
      return next
    })
  }, [])

  const clearDirtyNote = useCallback((name: NoteName) => {
    setDirtyNoteNames((prev) => {
      if (!prev.has(name)) return prev
      const next = new Set(prev)
      next.delete(name)
      return next
    })
  }, [])

  const saveNoteToFolder = useCallback(
    async (name: NoteName, options?: { silent?: boolean }) => {
      const directoryHandle = getDirectoryHandle()
      if (!directoryHandle) {
        if (!options?.silent && setLoadError) {
          setLoadError('请先选择一个笔记文件夹。')
        }
        return
      }
      const target = notes.find((note) => note.name === name)
      if (!target) return
      try {
        if (!options?.silent && setIsLoading) {
          setIsLoading(true)
        }

        // 写入文件（writeNote 会处理文件创建或更新）
        await writeNote(target, directoryHandle)

        clearDirtyNote(name)
        if (!options?.silent && setLoadError) {
          setLoadError(null)
        }
      } catch (error) {
        console.error(error)
        if (!options?.silent && setLoadError) {
          setLoadError('保存笔记失败，请检查权限后重试。')
        }
      } finally {
        if (!options?.silent && setIsLoading) {
          setIsLoading(false)
        }
      }
    },
    [notes, getDirectoryHandle, clearDirtyNote, setIsLoading, setLoadError],
  )

  const flushDirtyNote = useCallback(
    (noteName: NoteName | null) => {
      if (!noteName) return
      if (!dirtyNoteNames.has(noteName)) return
      void saveNoteToFolder(noteName, { silent: true })
    },
    [dirtyNoteNames, saveNoteToFolder],
  )

  // 自动保存：每10秒保存所有脏笔记
  useEffect(() => {
    if (dirtyNoteNames.size === 0) return
    const timer = setInterval(() => {
      dirtyNoteNames.forEach((name) => {
        void saveNoteToFolder(name, { silent: true })
      })
    }, 10000) // 每10秒自动保存
    return () => clearInterval(timer)
  }, [dirtyNoteNames, saveNoteToFolder])

  // 包装 updateNote，使其同时更新列表和标记为脏
  const updateNoteWithDirty = useCallback(
    (name: NoteName, patch: Partial<Note>) => {
      updateNote(name, patch)
      markNoteDirty(name)
    },
    [updateNote, markNoteDirty],
  )

  return {
    dirtyNoteNames,
    saveNoteToFolder,
    markNoteDirty,
    clearDirtyNote,
    flushDirtyNote,
    updateNote: updateNoteWithDirty,
  }
}


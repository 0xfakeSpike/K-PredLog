/**
 * 笔记配置管理 Hook
 * 负责配置的加载、保存和更新
 */

import { useCallback, useState } from 'react'
import {
  loadNoteConfig,
  saveNoteConfig,
  type NoteConfig,
} from '../noteConfig'

export interface UseNoteConfigManagerReturn {
  // 状态
  noteConfig: NoteConfig | null

  // 操作
  loadConfig: (directoryHandle: FileSystemDirectoryHandle) => Promise<void>
  resetConfig: () => void
  updateNoteConfig: (
    updates: Partial<NoteConfig>,
    directoryHandle: FileSystemDirectoryHandle,
  ) => Promise<void>
}

export function useNoteConfigManager(): UseNoteConfigManagerReturn {
  const [noteConfig, setNoteConfig] = useState<NoteConfig | null>(null)

  const loadConfig = useCallback(
    async (directoryHandle: FileSystemDirectoryHandle) => {
      try {
        const config = await loadNoteConfig(directoryHandle)
        setNoteConfig(config)
      } catch (error) {
        console.error('[useNoteConfigManager] Failed to load note config:', {
          error,
          errorName: error instanceof Error ? error.name : 'Unknown',
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          directoryName: directoryHandle.name,
        })
        // 出错时不设置配置，保持为 null，让问题暴露
        setNoteConfig(null)
        throw error
      }
    },
    [],
  )

  const resetConfig = useCallback(() => {
    setNoteConfig(null)
  }, [])

  const updateNoteConfig = useCallback(
    async (
      updates: Partial<NoteConfig>,
      directoryHandle: FileSystemDirectoryHandle,
    ) => {
      if (!noteConfig) {
        throw new Error('请先选择笔记文件夹')
      }

      const newConfig: NoteConfig = {
        ...noteConfig,
        ...updates,
      }

      await saveNoteConfig(newConfig, directoryHandle)
      setNoteConfig(newConfig)
      window.dispatchEvent(new CustomEvent('noteConfigUpdated'))
    },
    [noteConfig],
  )

  return {
    noteConfig,
    loadConfig,
    resetConfig,
    updateNoteConfig,
  }
}


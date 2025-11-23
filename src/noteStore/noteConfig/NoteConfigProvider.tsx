import { useMemo, type ReactNode, useEffect } from 'react'
import { NoteConfigContext } from './NoteConfigContext'
import { useNoteConfigManager } from '../hooks/useNoteConfigManager'
import { useNotesContext } from '../hooks/useNotesContext'

/**
 * NoteConfigProvider 组件
 * 负责管理笔记配置的共享状态
 * 
 * 注意：这个 Provider 必须在 NotesProvider 内部使用，因为它依赖 NotesContext 的 directoryHandle
 */
export function NoteConfigProvider({ children }: { children: ReactNode }) {
  const { directoryHandle } = useNotesContext()
  const { noteConfig, loadConfig, resetConfig, updateNoteConfig } = useNoteConfigManager()

  // 添加日志来追踪 noteConfig 的变化
  console.log('[NoteConfigProvider] Render - noteConfig:', noteConfig, 'directoryHandle:', directoryHandle?.name || 'null')

  // 当 directoryHandle 变化时，自动加载配置
  useEffect(() => {
    console.log('[NoteConfigProvider] useEffect triggered, directoryHandle:', directoryHandle?.name || 'null')
    if (directoryHandle) {
      console.log('[NoteConfigProvider] Calling loadConfig...')
      loadConfig(directoryHandle).catch((error) => {
        console.error('[NoteConfigProvider] Failed to load note config:', {
          error,
          errorName: error instanceof Error ? error.name : 'Unknown',
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          directoryName: directoryHandle.name,
        })
        // 不捕获错误，让错误暴露出来
      })
    } else {
      console.log('[NoteConfigProvider] directoryHandle is null, resetting config')
      console.trace('[NoteConfigProvider] resetConfig call stack')
      // 当 directoryHandle 为 null 时，重置配置
      resetConfig()
    }
  }, [directoryHandle, loadConfig, resetConfig])

  const value = useMemo(
    () => ({
      noteConfig,
      directoryHandle,
      loadConfig,
      updateNoteConfig,
    }),
    [noteConfig, directoryHandle, loadConfig, updateNoteConfig],
  )

  return <NoteConfigContext.Provider value={value}>{children}</NoteConfigContext.Provider>
}


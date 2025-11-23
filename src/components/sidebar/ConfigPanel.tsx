import { useState, useMemo, useCallback } from 'react'
import { getSourceOptions, SYMBOL_OPTIONS } from '../../klineData/dataSource'
import { DATA_SOURCE_CONFIGS } from '../../klineData/sources'
import { useNotesContext } from '../../noteStore/hooks/useNotesContext'
import { useNoteConfigContext } from '../../noteStore/hooks/useNoteConfigContext'
// 确保数据源已注册
import '../../klineData/sources'
import './ConfigPanel.css'

export function ConfigPanel() {
  const { sourceFolderName } = useNotesContext()
  const { noteConfig, directoryHandle, updateNoteConfig } = useNoteConfigContext()
  const [isSaving, setIsSaving] = useState(false)
  
  // 添加日志来追踪接收到的 noteConfig
  console.log('[ConfigPanel] Render - noteConfig:', noteConfig, 'directoryHandle:', directoryHandle?.name || 'null')
  
  // 获取数据源选项（确保数据源已加载）
  const sourceOptions = useMemo(() => getSourceOptions(), [])

  // 处理直接切换（无需编辑模式）
  const handleSourceChange = useCallback(async (newSource: string) => {
    const sourceConfig = DATA_SOURCE_CONFIGS[newSource as keyof typeof DATA_SOURCE_CONFIGS]
    if (!sourceConfig || !sourceConfig.enabled) {
      alert(`数据源 "${newSource}" 暂未启用，请选择其他数据源`)
      return
    }

    if (!directoryHandle) {
      alert('请先选择笔记文件夹')
      return
    }

    setIsSaving(true)
    try {
      await updateNoteConfig({ source: newSource }, directoryHandle)
    } catch (error) {
      console.error('Failed to update source:', error)
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      alert(`切换数据源失败：${errorMessage}`)
    } finally {
      setIsSaving(false)
    }
  }, [updateNoteConfig, directoryHandle])

  const handleSymbolChange = useCallback(async (newSymbol: string) => {
    if (!directoryHandle) {
      alert('请先选择笔记文件夹')
      return
    }

    setIsSaving(true)
    try {
      await updateNoteConfig({ symbol: newSymbol }, directoryHandle)
    } catch (error) {
      console.error('Failed to update symbol:', error)
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      alert(`切换标的失败：${errorMessage}`)
    } finally {
      setIsSaving(false)
    }
  }, [updateNoteConfig, directoryHandle])

  if (!noteConfig) {
    return null
  }

  return (
    <div className="config-panel">
      <div className="config-panel__header">
        <span className="config-panel__title">数据源配置</span>
      </div>
      <div className="config-panel__fields">
        <div className="config-panel__field">
          <label>
            <span>数据来源</span>
            <select
              value={noteConfig.source}
              onChange={(e) => handleSourceChange(e.target.value)}
              disabled={!sourceFolderName || isSaving}
              title={sourceFolderName ? '切换数据源' : '请先选择笔记文件夹'}
            >
              {sourceOptions.map((option: { label: string; value: string }) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="config-panel__field">
          <label>
            <span>标的</span>
            <select
              value={noteConfig.symbol}
              onChange={(e) => handleSymbolChange(e.target.value)}
              disabled={!sourceFolderName || isSaving}
              title={sourceFolderName ? '切换标的' : '请先选择笔记文件夹'}
            >
              {SYMBOL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  )
}

import { useMemo, useCallback } from 'react'
import { getSourceOptions, SYMBOL_OPTIONS } from '../../klineData/dataSource'
import { DATA_SOURCE_CONFIGS } from '../../klineData/sources'
import type { NoteConfig } from './hooks/useKlineConfig'
// 确保数据源已注册
import '../../klineData/sources'
import './ConfigPanel.css'

interface ConfigPanelProps {
  noteConfig: NoteConfig
  onUpdate: (updates: Partial<NoteConfig>) => void
}

export function ConfigPanel({ noteConfig, onUpdate }: ConfigPanelProps) {
  const sourceOptions = useMemo(() => getSourceOptions(), [])

  const handleSourceChange = useCallback(
    (newSource: string) => {
      const sourceConfig = DATA_SOURCE_CONFIGS[newSource as keyof typeof DATA_SOURCE_CONFIGS]
      if (!sourceConfig || !sourceConfig.enabled) {
        alert(`数据源 "${newSource}" 暂未启用，请选择其他数据源`)
        return
      }
      onUpdate({ source: newSource })
    },
    [onUpdate],
  )

  const handleSymbolChange = useCallback(
    (newSymbol: string) => {
      onUpdate({ symbol: newSymbol })
    },
    [onUpdate],
  )

  return (
    <div className="config-panel">
      <div className="config-panel__header">
        <span className="config-panel__title">数据源配置</span>
      </div>
      <div className="config-panel__fields">
        <div className="config-panel__field">
          <label>
            <span>数据来源</span>
            <select value={noteConfig.source} onChange={(e) => handleSourceChange(e.target.value)}>
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
            <select value={noteConfig.symbol} onChange={(e) => handleSymbolChange(e.target.value)}>
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


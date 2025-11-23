import { useEffect, useState } from 'react'
import type { CandlestickData, Time } from 'lightweight-charts'
import { type Timeframe } from '../../../klineData/types'
import { klineManager } from '../../../klineData/klineManager'
import { buildDataSourceId } from '../../../klineData/dataSource'
import type { NoteConfig } from '../../../noteStore/noteConfig'

type KlineState = {
  candles: CandlestickData<Time>[]
  isLoading: boolean
  lastUpdated: string | null
}

const INITIAL_STATE: KlineState = {
  candles: [],
  isLoading: true,
  lastUpdated: null,
}

/**
 * K线数据获取 Hook
 * 
 * 职责：纯粹的数据获取，不关心笔记或预测标记
 * 接受时间范围参数，返回K线数据
 * 
 * @param timeframe 时间周期
 * @param timeRange 时间范围
 * @param noteConfig 笔记配置（数据源和标的）
 */
export function useKlineData(
  timeframe: Timeframe,
  timeRange: { startTime: number; endTime: number } | null,
  noteConfig: NoteConfig | null,
) {
  const [state, setState] = useState<KlineState>(INITIAL_STATE)

  useEffect(() => {
    let isMounted = true
    setState((prev) => ({ ...prev, isLoading: true }))

    const loadData = async () => {
      if (!timeRange || !noteConfig) {
        setState({
          candles: [],
          isLoading: false,
          lastUpdated: null,
        })
        return
      }

      const dataSourceId = buildDataSourceId(noteConfig.source, noteConfig.symbol)

      const candles = await klineManager.getKlineData(
        timeframe,
        timeRange.startTime,
        timeRange.endTime,
        dataSourceId,
      )
      
      if (!isMounted) return
      
      setState({
        candles,
        isLoading: false,
        lastUpdated: new Date().toISOString(),
      })
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [
    timeframe,
    timeRange?.startTime,
    timeRange?.endTime,
    // 使用 noteConfig 对象本身，而不是它的属性，确保从 null 变为对象时能触发更新
    noteConfig,
    // 同时保留 source 和 symbol 作为依赖，确保配置值变化时也能触发更新
    noteConfig?.source,
    noteConfig?.symbol,
  ])

  return state
}


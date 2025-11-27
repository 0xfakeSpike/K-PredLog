import { useEffect, useState } from 'react'
import type { CandlestickData, Time } from 'lightweight-charts'
import { type Timeframe } from '../../../klineData/types'
import { klineManager } from '../../../klineData/klineManager'
import { buildDataSourceId } from '../../../klineData/dataSource'
import type { NoteConfig } from './useKlineConfig'

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
  noteConfig: NoteConfig,
) {
  const [state, setState] = useState<KlineState>(INITIAL_STATE)

  useEffect(() => {
    let isMounted = true
    setState((prev) => ({ ...prev, isLoading: true }))

    const loadData = async () => {
      if (!timeRange) {
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
    noteConfig,
    noteConfig.source,
    noteConfig.symbol,
  ])

  return state
}


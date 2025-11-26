import { useMemo, useState, useRef, useCallback } from 'react'
import type { IChartApi, ISeriesApi } from 'lightweight-charts'
import classNames from 'classnames'
import { useKlineDataWithPrediction } from './hooks/useKlineDataWithPrediction'
import { TIMEFRAME_OPTIONS, type Timeframe } from '../../klineData/types'
import { useNotesContext } from '../../noteStore/hooks/useNotesContext'
import { useNoteConfigContext } from '../../noteStore/hooks/useNoteConfigContext'
import { SegmentOverlay } from './prediction/segment/SegmentOverlay'
import { MarkerOverlay } from './prediction/marker/MarkerOverlay'
import { usePredictionData } from './hooks/usePredictionData'
import { KlineChart } from './kline/KlineChart'
import './KlineManager.css'

/**
 * K线管理器组件
 * 职责：
 * 1. 数据获取：获取K线数据和预测标记数据
 * 2. 组件协调：管理 KlineChart、MarkerOverlay、SegmentOverlay 三个渲染组件
 * 3. UI控制：处理时间周期切换、状态显示等用户交互
 * 
 * 注意：数据转换逻辑已提取到 usePredictionData Hook 中
 */
export function KlineManager() {
  const [timeframe, setTimeframe] = useState<Timeframe>('1D')
  const { notes, activeNote } = useNotesContext()
  const { noteConfig } = useNoteConfigContext()
  
  // 图表容器引用（必须在条件返回之前声明）
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  
  const { candles, isLoading, lastUpdated } = useKlineDataWithPrediction(timeframe, activeNote)
  
  // 使用提取的数据转换 Hook（必须在条件返回之前调用）
  const { chartMarkers, predictionSegments, activeMarkerTime } = usePredictionData(
    notes,
    candles,
    activeNote,
  )
  
  // 稳定化 onChartReady 回调，避免导致图表重新创建（必须在条件返回之前调用）
  const handleChartReady = useCallback((chart: IChartApi, series: ISeriesApi<'Candlestick'>) => {
    chartRef.current = chart
    seriesRef.current = series
  }, [])

  const statusText = useMemo(() => {
    if (isLoading) return '数据加载中...'
    if (!lastUpdated) return '等待更新'
    return `最近更新：${new Date(lastUpdated).toLocaleString('zh-CN')}`
  }, [isLoading, lastUpdated])

  const currentSymbolLabel = useMemo(() => {
    return noteConfig?.symbol.toUpperCase() ?? ''
  }, [noteConfig?.symbol])
  
  if (!noteConfig) {
    return null
  }

  return (
    <section className="kline-manager">
      <header className="kline-manager__header">
        <div>
          <p className="kline-manager__symbol">{currentSymbolLabel} / USDT</p>
          <p className="kline-manager__status">{statusText}</p>
        </div>
        <div className="kline-manager__actions">
          <div className="kline-manager__timeframes">
            {TIMEFRAME_OPTIONS.map((option) => (
              <button
                key={option}
                className={classNames('tf-btn', { 'is-active': timeframe === option })}
                onClick={() => setTimeframe(option)}
              >
                {option}
              </button>
            ))}
          </div>
          <button className="kline-manager__collapse" disabled>
            收起
          </button>
        </div>
      </header>
      <div className="kline-manager__body">
        <div className="kline-manager__chart" ref={containerRef} />
        <KlineChart
          containerRef={containerRef}
          candles={candles}
          activeMarkerTime={activeMarkerTime}
          activeNote={activeNote}
          timeframe={timeframe}
          onChartReady={handleChartReady}
        />
        {seriesRef.current && (
          <MarkerOverlay
            series={seriesRef.current}
            markers={chartMarkers}
          />
        )}
        {chartRef.current && (
          <SegmentOverlay
            chart={chartRef.current}
            predictionSegments={predictionSegments}
          />
        )}
        {isLoading && <div className="kline-manager__loader">加载中…</div>}
      </div>
    </section>
  )
}


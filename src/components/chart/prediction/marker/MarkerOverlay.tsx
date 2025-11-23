import { useEffect } from 'react'
import type { ISeriesApi, SeriesMarker, Time } from 'lightweight-charts'

type Props = {
  series: ISeriesApi<'Candlestick'> | null
  markers: SeriesMarker<Time>[]
}

/**
 * 预测标记覆盖层组件
 * 负责在 K 线图上设置预测标记
 */
export function MarkerOverlay({ series, markers }: Props) {
  // 更新标记
  useEffect(() => {
    if (!series) return
    
    try {
      // 检查 series 是否有效（通过尝试访问其方法）
      // 如果图表已被销毁，setMarkers 会抛出错误
      series.setMarkers(markers)
    } catch (error) {
      // 如果图表已被销毁，忽略错误
      // 这通常发生在组件卸载时
      if (error instanceof Error && error.message.includes('disposed')) {
        return
      }
      // 其他错误重新抛出
      throw error
    }
  }, [series, markers])

  // 此组件不渲染任何 DOM，只负责设置标记
  return null
}


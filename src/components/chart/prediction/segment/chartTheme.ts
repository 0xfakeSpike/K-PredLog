/**
 * K线图表主题配置
 * 将样式配置与组件逻辑分离
 */

export const chartTheme = {
  layout: {
    background: '#ffffff',
    textColor: '#475569',
  },
  grid: {
    vertLines: '#f1f5f9',
    horzLines: '#f1f5f9',
  },
  border: {
    timeScale: 'rgba(15,23,42,0.1)',
    priceScale: 'rgba(15,23,42,0.1)',
  },
  candlestick: {
    up: {
      color: '#22c55e',
      border: '#16a34a',
      wick: '#16a34a',
    },
    down: {
      color: '#ef4444',
      border: '#dc2626',
      wick: '#dc2626',
    },
  },
  prediction: {
    lineWidth: 2,
    colors: {
      long: '#22c55e',
      short: '#ef4444',
      range: '#f97316',
    },
  },
  dimensions: {
    height: 280,
  },
} as const


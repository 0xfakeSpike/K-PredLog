export type PredictionSegment = {
  startTime: number
  startPrice: number
  midTime?: number
  midPrice?: number
  endTime: number
  endPrice: number
  color: string
  isRange?: boolean // 标记是否为震荡行情
}


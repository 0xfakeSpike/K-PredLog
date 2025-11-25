/**
 * 曲线拟合相关函数
 * 用于生成预测线的点数据
 */

/**
 * 使用二次函数拟合，生成足够多的点形成平滑曲线
 * 曲线方程：y = ax² + bx + c
 * 
 * 核心思路：归一化处理
 * 由于时间戳数值太大（如 1672502400），直接计算会导致分母过大，a 值过小，曲线几乎为直线。
 * 解决方案：将时间戳归一化到 [0, 1] 区间进行计算，然后再映射回原始时间戳。
 * 
 * 步骤：
 * 1. 归一化：x1_norm = 0, x2_norm = 1
 * 2. 使用归一化的 x 值计算 a, b, c（此时分母很小，a 值足够大，弯曲效果明显）
 * 3. 在归一化的 x 轴上生成中间点（0, 0.1, 0.2, ..., 1）
 * 4. 将归一化的 x 值映射回原始时间戳：time = startTime + x_norm * (endTime - startTime)
 */
export function generateCurvePoints(
  startTime: number,
  startPrice: number,
  endTime: number,
  endPrice: number,
): Array<{ time: number; price: number }> {
  if (startTime >= endTime) {
    return [{ time: startTime, price: startPrice }]
  }

  // 归一化：将时间戳映射到 [0, 1] 区间
  // x1_norm = 0, x2_norm = 1
  const y1 = startPrice
  const y2 = endPrice

  let a: number
  let b: number
  const c = y1

  // 两个点拟合：使用起点和终点，通过引入弯曲系数来形成凹函数
  const curveFactor = 1.5 // 弯曲系数，值越大曲线越弯曲

  // 在归一化空间求解二次函数参数：y = ax² + bx + c
  // 为了形成凹函数（斜率越来越大），我们让曲线在中间点有更大的偏移
  // 直线上的中间点：y_mid_linear = y1 + (y2 - y1) * 0.5
  // 凹函数（斜率越来越大）：
  //   - 如果价格上涨（y2 > y1），曲线应该先慢后快，中间点应该低于直线（yMid < yMidLinear）
  //   - 如果价格下跌（y2 < y1），曲线应该先快后慢，中间点应该高于直线（yMid > yMidLinear）
  // 所以 offset 的符号应该与 (y2 - y1) 相反
  const yMidLinear = y1 + (y2 - y1) * 0.5
  const offset = -(y2 - y1) * curveFactor * 0.25 // 负号使曲线变成凹函数
  const yMid = yMidLinear + offset

  // 通过三个点求解：起点 (0, y1)、中点 (0.5, yMid)、终点 (1, y2)
  // a = -4 * (yMid - 0.5(y1 + y2))
  a = -4 * (yMid - 0.5 * (y1 + y2))
  b = (y2 - y1) - a

  // 根据时间跨度动态生成点数，确保曲线平滑
  const timeSpanSeconds = endTime - startTime
  // 每24小时（1天）生成一个点，最少10个点，最多50个点
  const numPoints = Math.max(10, Math.min(50, Math.ceil(timeSpanSeconds / (24 * 60 * 60))))

  const points: Array<{ time: number; price: number }> = []
  const xStep = 1 / (numPoints - 1)

  for (let i = 0; i < numPoints; i++) {
    // 在归一化空间生成点
    const xNorm = i * xStep
    // 计算对应的 y 值（价格）
    const price = a * xNorm * xNorm + b * xNorm + c
    // 将归一化的 x 映射回原始时间戳
    const time = startTime + xNorm * (endTime - startTime)
    points.push({ time, price })
  }

  // 确保包含起点和终点（数值精度问题可能导致轻微偏差）
  points[0] = { time: startTime, price: startPrice }
  points[points.length - 1] = { time: endTime, price: endPrice }

  return points
}

/**
 * 生成震荡波浪线（锯齿状）
 * 在起点价格附近上下波动，形成锯齿状的震荡效果
 */
export function generateRangeWavePoints(
  startTime: number,
  startPrice: number,
  endTime: number,
  endPrice: number,
): Array<{ time: number; price: number }> {
  if (startTime >= endTime) {
    return [{ time: startTime, price: startPrice }]
  }

  // 根据时间跨度动态生成点数，确保波浪线有足够的锯齿
  const timeSpanSeconds = endTime - startTime
  // 每12小时生成一个点，最少20个点，最多100个点（震荡需要更多点来形成锯齿）
  const numPoints = Math.max(20, Math.min(100, Math.ceil(timeSpanSeconds / (12 * 60 * 60))))

  const points: Array<{ time: number; price: number }> = []
  const timeStep = (endTime - startTime) / (numPoints - 1)

  // 震荡幅度：基于起点价格的百分比（例如 1%）
  const amplitude = startPrice * 0.01
  // 波浪周期：将整个时间段分成多个周期
  const numCycles = Math.max(3, Math.floor(numPoints / 8)) // 至少3个周期，最多每8个点一个周期

  for (let i = 0; i < numPoints; i++) {
    const time = startTime + i * timeStep
    // 归一化位置 [0, 1]
    const progress = i / (numPoints - 1)

    // 使用锯齿波函数生成震荡效果
    // 锯齿波：y = 2 * (x - floor(x + 0.5))，范围 [-1, 1]
    const cyclePosition = (progress * numCycles) % 1
    // 将锯齿波映射到 [-1, 1]
    const waveValue =
      cyclePosition < 0.5
        ? 4 * cyclePosition - 1 // 上升段：从 -1 到 1
        : 3 - 4 * cyclePosition // 下降段：从 1 到 -1

    // 计算价格：在起点价格附近上下波动
    const price = startPrice + waveValue * amplitude

    points.push({ time, price })
  }

  // 确保起点和终点价格正确
  points[0] = { time: startTime, price: startPrice }
  points[points.length - 1] = { time: endTime, price: endPrice }

  return points
}


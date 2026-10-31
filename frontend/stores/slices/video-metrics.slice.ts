import { createSlice, PayloadAction } from '@reduxjs/toolkit'

type Metrics = {id: string; likesCount?: number; comment_count?: number}
const slice = createSlice({
  name: 'videoMetrics',
  initialState: {} as Record<string, Omit<Metrics, 'id'>>,
  reducers: {
    received(state, {payload}: PayloadAction<Metrics[]>) {
      for (const {id, likesCount, comment_count} of payload) {
        const value = state[id] ||= {}
        if (typeof likesCount === 'number') value.likesCount = likesCount
        if (typeof comment_count === 'number') value.comment_count = comment_count
      }
      // Bound this view cache; fresh feed responses replace mutation results.
      const ids = Object.keys(state)
      for (const id of ids.slice(0, Math.max(0, ids.length - 300))) delete state[id]
    },
  },
})
export const videoMetricsReceived = slice.actions.received
export default slice.reducer

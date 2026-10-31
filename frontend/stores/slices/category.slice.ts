import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"

import { DOMEN } from "../../domen.api"

export interface ICategory {
  id: string
  name: string
  alias: string
  secondLevelCategory: SecondLevelCategory[]
}

export interface SecondLevelCategory {
  id: string
  name: string
  alias: string
  firstLevelId: string
}

export interface CategoryState {
  category: ICategory[]
  currentCategory?: ICategory
  pending: boolean
  error: boolean
}
const initialState: CategoryState = {
  category: [],
  pending: false,
  error: false,
}
export const getFirstCategory = createAsyncThunk<
  ICategory[],
  undefined,
  { rejectValue: string }
>("firstCategory", async (_, { rejectWithValue }) => {
  const response = await fetch(DOMEN.category.getCategory)
  if (!response) {
    return rejectWithValue("Not found")
  }
  if (!response.ok) {
    return rejectWithValue("SERVER ERROR 500")
  }
  const data = await response.json()
  // await new Promise((resolve) => setTimeout(() => resolve(''),1000));
  return data
})
const firstCategorySlice = createSlice({
  name: "firstCategory",
  initialState,
  reducers: {
    setCurrentCategory: (state, { payload }) => {
      state.currentCategory = payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getFirstCategory.pending, (state) => {
        state.pending = true
      })
      .addCase(getFirstCategory.fulfilled, (state, { payload }) => {
        state.pending = false
        state.category = payload
      })
      .addCase(getFirstCategory.rejected, (state) => {
        state.pending = false
        state.error = true
      })
  },
})
export default firstCategorySlice.reducer

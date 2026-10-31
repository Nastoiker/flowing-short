import { configureStore } from '@reduxjs/toolkit'
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'
import { videoHostingApi } from './slices/api'
import category from './slices/category.slice'
import search from './slices/search.slice'
import tag from './slices/tag.slice'
import { MusicApi } from './slices/music.slice'
import { AuthApi } from './slices/regapi'
import { UserApi } from './slices/user.api'
import { VideoUserApi } from './slices/video.api'
import { AdminApi } from './slices/admin.api'

export const makeStore = () => configureStore({
  reducer: {search, category, tag,
    [MusicApi.reducerPath]: MusicApi.reducer,
    [VideoUserApi.reducerPath]: VideoUserApi.reducer,
    [videoHostingApi.reducerPath]: videoHostingApi.reducer,
    [AuthApi.reducerPath]: AuthApi.reducer,
    [UserApi.reducerPath]: UserApi.reducer,
    [AdminApi.reducerPath]: AdminApi.reducer},
  middleware: getDefault => getDefault().concat(videoHostingApi.middleware, AuthApi.middleware,
    UserApi.middleware, VideoUserApi.middleware, MusicApi.middleware, AdminApi.middleware),
})
export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

"use client"
import { useGetVideosQuery } from "@/stores/slices/api"
import { useCheckAuthQuery } from "@/stores/slices/regapi"
import { LayoutVideo } from "@/components/Layot.video"
export default function IndexPage() {
  const { data, isLoading, error, refetch } = useGetVideosQuery({ limit: 10, offset: 0 })
  const user = useCheckAuthQuery({})
  return <main className="px-3 max-w-full">
    <h1 className="text-3xl font-bold my-8">Рекомендации</h1>
    {isLoading ? <p role="status">Загрузка…</p> : error ? <div role="alert"><p>Не удалось загрузить видео.</p><button onClick={() => refetch()}>Повторить</button></div> : <LayoutVideo user={user.data} videos={data || []}/>}
  </main>
}

"use client"
import { useEffect, useState } from 'react'
import { RefreshCw, Star } from 'lucide-react'
import { useFeedQuery } from '@/stores/slices/api'
import { IVideo } from '@/types/Video.interface'
import { useCurrentUser } from '@/features/auth/use-current-user'
import { FeedList } from './feed-list'

export function FeedPage() {
  const [sort, setSort] = useState<'recent' | 'popular'>('recent')
  const [offset, setOffset] = useState(0)
  const [videos, setVideos] = useState<IVideo[]>([])
  const {currentData, isFetching, error, refetch} = useFeedQuery({limit: 12, offset, sort})
  const {data:user} = useCurrentUser()
  useEffect(() => {
    if (!currentData) return
    setVideos(previous => offset === 0 ? currentData.items :
      [...new Map([...previous, ...currentData.items].map(item => [item.id, item])).values()])
  }, [currentData, offset])
  const changeSort = (value:'recent'|'popular') => {setSort(value);setOffset(0);setVideos([])}
  return <main className="mx-auto max-w-5xl">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400"><Star size={14}/>Ваша лента</p><h1 className="text-3xl font-bold tracking-tight">Рекомендации</h1><p className="mt-2 text-sm text-muted-foreground">Новые истории, авторы и короткие видео.</p></div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">Сначала
        <select aria-label="Сортировка ленты" value={sort} onChange={event=>changeSort(event.target.value as 'recent'|'popular')} className="rounded-xl border bg-background px-3 py-2 text-foreground">
          <option value="recent">Новые</option><option value="popular">Популярные</option>
        </select>
      </label>
    </div>
    {isFetching && !videos.length ? <div role="status" aria-label="Загрузка видео" className="mx-auto max-w-[440px] animate-pulse space-y-3 rounded-2xl border p-4"><div className="h-8 w-40 rounded-lg bg-muted"/><div className="aspect-[9/16] max-h-[620px] rounded-xl bg-muted"/><span className="sr-only">Загрузка…</span></div>
      : error && !videos.length ? <div role="alert" className="rounded-2xl border p-8 text-center"><p>Не удалось загрузить видео.</p><button className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-primary-foreground" onClick={()=>refetch()}><RefreshCw size={16}/>Повторить</button></div>
        : <FeedList videos={videos} user={user} sortable={false}/>}
    {!!videos.length && <div className="mx-auto mt-8 max-w-[440px] text-center">
      {error && <p role="alert" className="mb-3 text-sm text-destructive">Не удалось загрузить следующую страницу.</p>}
      {isFetching ? <p role="status" className="text-sm text-muted-foreground">Загрузка следующей страницы…</p>
        : error ? <button className="rounded-full border px-6 py-2" onClick={()=>refetch()}>Повторить загрузку</button>
        : currentData?.hasMore ? <button disabled={isFetching} className="rounded-full border px-6 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50" onClick={()=>{if(currentData.nextOffset !== null)setOffset(currentData.nextOffset)}}>{isFetching?'Загрузка…':'Показать ещё'}</button>
          : <p className="text-sm text-muted-foreground">Вы посмотрели всю ленту</p>}
    </div>}
  </main>
}

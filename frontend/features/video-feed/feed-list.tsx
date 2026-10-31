"use client"
import { useCallback, useMemo, useState } from 'react'
import { IVideo } from '@/types/Video.interface'
import { IUser } from '@/types/User.interface'
import { VideoCard } from './video-card'

export function FeedList({videos = [], user, sortable = true}: {videos: IVideo[]; user?: IUser; sortable?: boolean}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [sort, setSort] = useState('recent')
  const activate = useCallback((id: string) => setActiveId(id), [])
  const ordered = useMemo(() => !sortable ? videos : [...videos].sort((a, b) =>
    (sort === 'popular' ? b.likesCount - a.likesCount : 0) ||
    Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.id.localeCompare(b.id)), [videos, sort, sortable])
  return <section aria-label="Лента видео" className="w-full max-w-5xl">
    {sortable && <div className="mb-5 flex justify-end"><label className="flex items-center gap-2 text-sm text-muted-foreground">Сначала
      <select aria-label="Сортировка видео" value={sort} onChange={event => setSort(event.target.value)} className="rounded-lg border bg-background px-3 py-2 text-foreground">
        <option value="recent">Новые</option><option value="popular">Популярные</option>
      </select>
    </label></div>}
    {ordered.length ? <div className="space-y-8">{ordered.map(video =>
      <VideoCard key={video.id} video={video} user={user} active={activeId === video.id} activate={activate}/>)}</div>
      : <div className="rounded-2xl border border-dashed p-10 text-center"><h2 className="font-semibold">Пока нет видео</h2><p className="mt-2 text-sm text-muted-foreground">Попробуйте другую категорию или измените запрос.</p></div>}
  </section>
}

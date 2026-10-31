"use client"
import { memo, useCallback, useState } from 'react'
import { useAppSelector } from '@/stores'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Heart, MessageCircle, Play, Pause, Eye } from 'lucide-react'
import { IVideo } from '@/types/Video.interface'
import { IUser } from '@/types/User.interface'
import { api_url } from '@/domen.api'
import { useDeleteVideoMutation, useFollowChannelMutation, useLikeVideoMutation, useUnfollowChannelMutation, useWatchVideoMutation } from '@/stores/slices/user.api'
import { useWatchVideounLoginMutation } from '@/stores/slices/video.api'
import { Report } from '@/components/Report/Report'
import { PlaybackProgress } from './playback-progress'
import { useVideoPlayback } from './use-video-playback'

const CommentsPanel = dynamic(() => import('@/components/Comment/commentScrollArea'), {loading: () => <p role="status">Загрузка комментариев…</p>})
type Props = { video: IVideo; user?: IUser; active: boolean; activate: (id: string) => void }

export const VideoCard = memo(function VideoCard({video, user, active, activate}: Props) {
  const [like, likeState] = useLikeVideoMutation({fixedCacheKey: video.id})
  const [follow, followState] = useFollowChannelMutation({fixedCacheKey: video.authorVideo.id})
  const [unfollow, unfollowState] = useUnfollowChannelMutation({fixedCacheKey: video.authorVideo.id})
  const [remove, removeState] = useDeleteVideoMutation()
  const [watch] = useWatchVideoMutation()
  const [watchGuest] = useWatchVideounLoginMutation()
  const liked = Boolean(user?.Like?.some(item => item.videoId === video.id && item.like !== false))
  const followingId = user?.folowing?.find(item => item.authorId === video.authorVideo.id)?.id
  const metrics = useAppSelector(state => state.videoMetrics[video.id])
  const likes = metrics?.likesCount ?? video.likesCount
  const comments = metrics?.comment_count ?? video.comment_count ?? video.Comment?.length ?? 0
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [removed, setRemoved] = useState(false)
  const [message, setMessage] = useState('')
  const onActivate = useCallback(() => activate(video.id), [activate, video.id])
  const onStarted = useCallback(() => {
    const request = user ? watch : watchGuest
    void request({videoId: video.id}).unwrap().catch(() => {})
  }, [user, watch, watchGuest, video.id])
  const playback = useVideoPlayback(active, onActivate, onStarted, video.music?.music_url ? `${api_url}/user${video.music.music_url}` : undefined)

  const toggleLike = async () => {
    if (!user || likeState.isLoading) return
    setMessage('')
    try {
      await like({videoId: video.id}).unwrap()
    } catch { setMessage('Не удалось сохранить лайк. Попробуйте ещё раз.') }
  }
  const toggleFollow = async () => {
    if (!user || followState.isLoading || unfollowState.isLoading) return
    setMessage('')
    try {
      if (followingId) {
        await unfollow({id: followingId, authorId: video.authorVideo.id}).unwrap()
      } else {
        await follow({authorId: video.authorVideo.id}).unwrap()
      }
    } catch { setMessage('Не удалось изменить подписку. Попробуйте ещё раз.') }
  }
  const deleteVideo = async () => {
    if (!window.confirm('Удалить это видео?')) return
    try { await remove(video.id).unwrap(); playback.pause(); setRemoved(true) }
    catch { setMessage('Не удалось удалить видео. Попробуйте ещё раз.') }
  }
  if (removed) return null
  return <article data-video-id={video.id} className="mx-auto w-full max-w-[440px] overflow-hidden rounded-2xl border bg-card shadow-sm">
    <header className="flex items-center justify-between gap-3 px-4 py-3">
      <Link href={`/channel/${video.authorVideo.id}`} className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500">
        {video.authorVideo.avatar ? <img loading="lazy" alt="" width={36} height={36} className="h-9 w-9 rounded-full object-cover" src={`${api_url}/user${video.authorVideo.avatar}`}/>
          : <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sky-100 font-semibold text-sky-700">{video.authorVideo.login?.slice(0, 1).toUpperCase()}</span>}
        <span className="min-w-0"><span className="block truncate text-sm font-semibold">{video.authorVideo.login}</span><span className="block text-xs text-muted-foreground">{video.secondCategory?.name || 'Короткие видео'}</span></span>
      </Link>
      {user?.id === video.authorVideo.id ? <button className="text-xs text-muted-foreground" disabled={removeState.isLoading} onClick={deleteVideo}>Удалить</button>
        : user ? <button disabled={followState.isLoading || unfollowState.isLoading} onClick={toggleFollow} className="shrink-0 rounded-full bg-secondary px-3 py-2 text-xs font-medium hover:bg-accent disabled:opacity-50">{followingId ? 'Отписаться' : 'Подписаться'}</button>
          : <Link href="/authorization" className="shrink-0 rounded-full bg-secondary px-3 py-2 text-xs font-medium">Подписаться</Link>}
    </header>
    <div className="relative bg-slate-950">
      <video ref={playback.videoRef} src={`${api_url}/media${video.embed_link}`} aria-label={video.Title}
        className="mx-auto aspect-[9/16] max-h-[620px] w-full object-contain focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"
        width={360} height={640} playsInline preload="metadata" loop tabIndex={0}
        onClick={playback.toggle} onKeyDown={event => {if (event.key === ' ' || event.key === 'Enter') {event.preventDefault(); void playback.toggle()}}}/>
      <button type="button" onClick={playback.toggle} aria-label={`${playback.playing ? 'Пауза' : 'Воспроизвести'}: ${video.Title}`} className="absolute bottom-3 right-3 rounded-full bg-black/60 p-2.5 text-white hover:bg-black/80">
        {playback.playing ? <Pause size={19}/> : <Play size={19}/>}
      </button>
    </div>
    <PlaybackProgress video={playback.videoRef}/>
    <div className="space-y-3 p-4">
      <div><h2 className="font-semibold leading-snug">{video.Title}</h2><p className="mt-1 break-words text-sm leading-relaxed text-muted-foreground">{video.Description}</p></div>
      {!!video.tag?.length && <div className="flex flex-wrap gap-2">{video.tag.map(item => <Link key={item.tag.id} className="rounded-full bg-sky-50 px-2 py-1 text-xs text-sky-700 dark:bg-sky-950 dark:text-sky-300" href={`/tags/${item.tag.name.replace(/^#/, '')}`}>{item.tag.name}</Link>)}</div>}
      <div className="flex items-center gap-4 border-t pt-3 text-sm">
        {user ? <button aria-label="Нравится" aria-pressed={liked} disabled={likeState.isLoading} onClick={toggleLike} className={`flex items-center gap-1.5 disabled:opacity-50 ${liked ? 'text-rose-500' : 'text-muted-foreground'}`}><Heart size={19} fill={liked ? 'currentColor' : 'none'}/>{likes}</button>
          : <Link aria-label="Войти, чтобы поставить лайк" href="/authorization" className="flex items-center gap-1.5 text-muted-foreground"><Heart size={19}/>{likes}</Link>}
        <button aria-label="Комментарии" aria-expanded={commentsOpen} onClick={() => setCommentsOpen(value => !value)} className="flex items-center gap-1.5 text-muted-foreground"><MessageCircle size={19}/>{comments}</button>
        <span className="flex items-center gap-1.5 text-muted-foreground" aria-label={`Просмотры: ${video.view_count}`}><Eye size={18}/>{video.view_count ?? video.watchers?.length ?? 0}</span>
        <div className="ml-auto"><Report videoId={video.id} userId={user?.id}/></div>
      </div>
      {(message || playback.error) && <p role="alert" className="text-sm text-destructive">{message || playback.error}</p>}
      {commentsOpen && <CommentsPanel video={video} user={user}/>}
    </div>
  </article>
})

"use client"
import { CommentCard } from '@/components/Comment/Comment.card'
import { ICommentsProps } from '@/components/Comment/Comment.props'
import { CommentForm } from '@/components/Comment/CommentSend'
import { useGetCommentsByVideoQuery } from '@/stores/slices/video.api'
export default function CommentsModal({video,user}:ICommentsProps) {
 const {data,isLoading,error,refetch}=useGetCommentsByVideoQuery(video.id)
 return <section aria-label="Обсуждение видео" className="border-t pt-3">
  {isLoading?<p role="status" className="text-sm">Загрузка комментариев…</p>:error?<div role="alert" className="text-sm"><p>Не удалось загрузить комментарии.</p><button onClick={()=>refetch()}>Повторить</button></div>:data?.length?<div className="max-h-80 overflow-y-auto">{data.map(comment=><CommentCard key={comment.id} comment={comment}/>)}</div>:<p className="text-sm text-muted-foreground">Пока нет комментариев. Начните обсуждение.</p>}
  <CommentForm video={video} user={user} sendComment={async()=>{await refetch()}}/>
 </section>
}

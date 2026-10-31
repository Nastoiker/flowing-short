"use client"
import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { useCommentVideoMutation } from '@/stores/slices/user.api'
import { IUser } from '@/types/User.interface'
import { IVideo } from '@/types/Video.interface'
export function CommentForm({video,user,sendComment}: {video:IVideo;user?:IUser;sendComment:()=>void|Promise<void>}) {
 const {register,handleSubmit,reset,formState:{errors}}=useForm<{comment:string}>()
 const [send,state]=useCommentVideoMutation()
 const [message,setMessage]=useState('')
 const submit=handleSubmit(async values=>{
  setMessage('')
  try {await send({videoId:video.id,comment:values.comment}).unwrap();await sendComment();reset()}
  catch {setMessage('Не удалось отправить комментарий. Текст сохранён — попробуйте ещё раз.')}
 })
 if(!user)return <Link href="/authorization" className="mt-3 block text-sm text-sky-600">Войдите, чтобы комментировать</Link>
 const id=`comment-${video.id}`
 return <form method="post" onSubmit={submit} className="mt-3 space-y-2">
  <label htmlFor={id} className="text-sm font-medium">Ваш комментарий</label>
  <textarea id={id} rows={3} maxLength={2000} className="w-full rounded-xl border bg-background p-3 text-sm" {...register('comment',{required:'Напишите комментарий',validate:value=>!!value.trim()||'Напишите комментарий'})}/>
  {errors.comment&&<p role="alert" className="text-sm text-destructive">{errors.comment.message}</p>}
  {message&&<p role="alert" className="text-sm text-destructive">{message}</p>}
  <button disabled={state.isLoading} type="submit" className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">{state.isLoading?'Отправляем…':'Отправить комментарий'}</button>
 </form>
}

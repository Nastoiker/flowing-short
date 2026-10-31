"use client"
import { useState } from 'react'
import Link from 'next/link'
import { Flag } from 'lucide-react'
import { useReportOnVideoMutation } from '@/stores/slices/user.api'
import { useGetReportsQuery } from '@/stores/slices/api'

export function Report({videoId,userId}: {videoId:string;userId?:string}) {
  const [open,setOpen]=useState(false)
  const [message,setMessage]=useState('')
  const reports=useGetReportsQuery({}, {skip:!open || !userId})
  const [report,state]=useReportOnVideoMutation()
  async function send(reportId:string) {
    try { await report({reportId,userId,videoId}).unwrap();setOpen(false);setMessage('Жалоба отправлена') }
    catch {setMessage('Не удалось отправить жалобу. Попробуйте ещё раз.')}
  }
  return <div className="relative">
    <button type="button" aria-label="Пожаловаться на видео" aria-expanded={open} onClick={()=>setOpen(value=>!value)} className="rounded-md p-1 text-muted-foreground hover:text-foreground"><Flag size={18}/></button>
    {open && <div className="absolute bottom-9 right-0 z-20 w-56 space-y-2 rounded-xl border bg-popover p-3 shadow-lg">
      <button type="button" className="mb-2 text-xs text-muted-foreground" onClick={()=>setOpen(false)}>Закрыть</button>
      {!userId ? <Link className="block text-sm" href="/authorization">Войдите, чтобы отправить жалобу</Link>
        : reports.isLoading ? <p role="status">Загрузка…</p>
        : reports.error ? <button onClick={()=>reports.refetch()}>Не удалось загрузить. Повторить</button>
        : reports.data?.length ? reports.data.map(reason=><button key={reason.id} className="block text-left text-sm" disabled={state.isLoading} onClick={()=>send(reason.id)}>{reason.message}</button>)
        : <p className="text-sm">Причины жалоб пока не настроены</p>}
    </div>}
    {message && <p role="status" className="text-xs">{message}</p>}
  </div>
}

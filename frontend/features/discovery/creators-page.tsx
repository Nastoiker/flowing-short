"use client"
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'

type Creator = {userId:string; displayName:string; authorUrl:string; avatar:string|null; registeredAt:string}
export function CreatorsPage() {
  const [creators,setCreators]=useState<Creator[]>([])
  const [loading,setLoading]=useState(true)
  const [failed,setFailed]=useState(false)
  const [attempt,setAttempt]=useState(0)
  useEffect(()=>{
    let active=true
    const controller=new AbortController()
    const timeout=setTimeout(()=>controller.abort(),10000)
    setLoading(true);setFailed(false)
    fetch('/api/creators?limit=30',{signal:controller.signal})
      .then(response=>{if(!response.ok)throw new Error('Creators unavailable');return response.json()})
      .then(items=>setCreators(items))
      .catch(()=>{if(active)setFailed(true)})
      .finally(()=>{clearTimeout(timeout);if(active)setLoading(false)})
    return ()=>{active=false;clearTimeout(timeout);controller.abort()}
  },[attempt])
  return <main className="mx-auto max-w-5xl">
    <div className="mb-7"><p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-600"><Users size={15}/>Сообщество</p><h1 className="text-3xl font-bold">Авторы</h1><p className="mt-2 text-sm text-muted-foreground">Открывайте новые каналы и находите свои интересы.</p></div>
    {loading ? <p role="status">Загрузка авторов…</p> : failed ? <div role="alert" className="rounded-xl border p-6"><p>Не удалось загрузить авторов.</p><button className="mt-3 rounded-full border px-4 py-2" onClick={()=>setAttempt(value=>value+1)}>Повторить</button></div>
      : !creators.length ? <p className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">Здесь скоро появятся новые авторы.</p>
        : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{creators.map(creator=><Link key={creator.userId} href={`/channel/${creator.userId}`} className="flex min-w-0 items-center gap-4 rounded-2xl border bg-card p-5 transition-colors hover:border-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500">
          {creator.avatar ? <img alt="" loading="lazy" src={`/api/user${creator.avatar}`} width={48} height={48} className="h-12 w-12 rounded-full object-cover"/>:<span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sky-100 text-xl font-semibold text-sky-700">{creator.displayName.slice(0,1).toUpperCase()}</span>}
          <span className="min-w-0"><span className="block truncate font-semibold">{creator.displayName}</span><span className="mt-1 block text-xs text-muted-foreground">Открыть канал →</span></span>
        </Link>)}</div>}
  </main>
}

"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
export const Search = () => {
 const [value, setValue] = useState('')
 const router = useRouter()
 return <form role="search" className="mx-2 sm:mx-10 min-w-0 flex-1" onSubmit={e=>{e.preventDefault();if(value.trim()) router.push('/founded/'+encodeURIComponent(value.trim()))}}>
   <Input type="search" aria-label="Поиск видео" value={value} onChange={e=>setValue(e.target.value)} placeholder="Поиск" maxLength={100}/>
 </form>
}

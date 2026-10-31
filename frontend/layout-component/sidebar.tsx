"use client"
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { Categories } from '@/components/Categoryes/Categories'
import { PopularTags } from '@/components/Header/PopularTags'
export function LeftSite({className}: {className?:string}) {
 const [open,setOpen]=useState(false)
 const path=usePathname()
 useEffect(()=>setOpen(false),[path])
 return <div className={className}>
  <button type="button" aria-label="Открыть категории" aria-controls="category-navigation" aria-expanded={open} onClick={()=>setOpen(true)} className="fixed left-3 top-[72px] z-30 rounded-full border bg-background p-1.5 shadow-sm md:hidden"><Menu size={18}/></button>
  {open && <button type="button" aria-label="Скрыть меню" onClick={()=>setOpen(false)} className="fixed inset-0 top-16 z-30 bg-black/30 md:hidden"/>}
  <aside id="category-navigation" aria-label="Категории и теги" className={`${open?'block':'hidden'} fixed bottom-0 left-0 top-16 z-40 w-48 overflow-y-auto border-r bg-background px-3 pb-8 md:block`}>
   <button type="button" aria-label="Закрыть категории" onClick={()=>setOpen(false)} className="ml-auto mt-3 block rounded-full p-1 hover:bg-accent md:hidden"><X size={19}/></button>
   <nav className="mt-5 space-y-1 border-b pb-4" aria-label="Главная навигация"><Link href="/" className={`block rounded-xl px-3 py-2 text-sm ${path==='/'?'bg-sky-50 font-medium text-sky-700 dark:bg-sky-950 dark:text-sky-300':'hover:bg-accent'}`}>Лента</Link><Link href="/creators" className={`block rounded-xl px-3 py-2 text-sm ${path==='/creators'?'bg-sky-50 font-medium text-sky-700 dark:bg-sky-950 dark:text-sky-300':'hover:bg-accent'}`}>Авторы</Link></nav>
   <Categories/><PopularTags/>
  </aside>
 </div>
}

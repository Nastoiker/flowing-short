"use client"
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { SecondLevelCategory } from '@/stores/slices/category.slice'
export function CategoryButton({name,alias,secondLevelCategory}:{name:string;alias:string;secondLevelCategory:SecondLevelCategory[]}) {
 const pathname=usePathname()
 const [open,setOpen]=useState(false)
 return <div>
  <button type="button" aria-expanded={open} aria-controls={`category-${alias}`} onClick={()=>setOpen(value=>!value)} className="flex w-full items-center justify-between gap-2 rounded-xl bg-secondary px-3 py-2 text-left text-sm font-medium hover:bg-accent">{name}<ChevronDown aria-hidden="true" size={15} className={open?'rotate-180':''}/></button>
  {open&&<ul id={`category-${alias}`} className="mt-2 space-y-1 border-l pl-3">{secondLevelCategory.map(category=><li key={category.id}><Link href={`/category/${category.alias}`} aria-current={pathname===`/category/${category.alias}`?'page':undefined} className="block rounded-lg px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground aria-[current=page]:font-semibold aria-[current=page]:text-sky-600">{category.name}</Link></li>)}</ul>}
 </div>
}

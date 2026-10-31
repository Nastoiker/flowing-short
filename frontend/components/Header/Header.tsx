"use client"
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Sun, Moon, User, LogOut } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useCurrentUser } from '@/features/auth/use-current-user'
import { Search } from '@/components/search/search'
import Logo from '/public/logo.svg'
import LogoDark from '/public/logoDark.svg'

export function Header() {
  const {data:user}=useCurrentUser()
  const {resolvedTheme,setTheme}=useTheme()
  const [open,setOpen]=useState(false)
  const logout=()=>{localStorage.removeItem('token');window.location.assign('/')}
  return <div className="flex h-16 w-full items-center gap-3 border-b bg-background/95 px-3 backdrop-blur sm:gap-5 sm:px-6">
    <Link href="/" aria-label="logo" className="shrink-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500">
      <Image src={Logo} alt="" width={100} height={40} className="dark:hidden"/>
      <Image src={LogoDark} alt="" width={100} height={40} className="hidden dark:block"/>
    </Link>
    <div className="min-w-0 flex-1"><Search/></div>
    <button aria-label="Переключить тему" className="shrink-0 rounded-full p-2 hover:bg-accent" onClick={()=>setTheme(resolvedTheme==='dark'?'light':'dark')}><Sun size={21} className="dark:hidden"/><Moon size={21} className="hidden dark:block"/></button>
    <div className="relative">
      <button aria-label="Аккаунт" aria-expanded={open} onClick={()=>setOpen(value=>!value)} className="rounded-full bg-secondary p-2"><User size={22}/></button>
      {open && <div className="absolute right-0 top-12 z-50 w-48 space-y-1 rounded-xl border bg-popover p-2 shadow-lg">
        {user ? <><p className="truncate px-3 py-2 text-sm font-medium">{user.login}</p><Link className="block rounded-lg px-3 py-2 text-sm hover:bg-accent" href="/profile" onClick={()=>setOpen(false)}>Мой профиль</Link><Link className="block rounded-lg px-3 py-2 text-sm hover:bg-accent" href="/createVideo" onClick={()=>setOpen(false)}>Загрузить видео</Link><button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent" onClick={logout}><LogOut size={15}/>Выйти</button></>
          : <><Link className="block rounded-lg px-3 py-2 text-sm hover:bg-accent" href="/authorization" onClick={()=>setOpen(false)}>Войти</Link><Link className="block rounded-lg px-3 py-2 text-sm hover:bg-accent" href="/registration" onClick={()=>setOpen(false)}>Регистрация</Link></>}
      </div>}
    </div>
  </div>
}

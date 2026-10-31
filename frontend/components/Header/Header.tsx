"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { useAppSelector } from "@/stores"
import {
  AuthApi,
  useAuthorizationQuery,
  useCheckAuthQuery,
} from "@/stores/slices/regapi"
import Logo from '/public/logo.svg';
import LogoDark from '/public/logoDark.svg';
import { cn } from "@/lib/utils"
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar";
import './header.module.css';
import { AuthComponent } from "@/components/Auth/Auth"
import { IHeaderProps } from "@/components/Header/HeaderProps"
import { Search } from "@/components/search/search"
import { Button } from "@/components/ui/button"
import { ProfileIcon } from "@/components/user/Profile.icon"
import Image from "next/image";
import Moon from 'public/moon.svg';
import Sun from 'public/sun.svg';
import {useTheme} from "next-themes";
export const Header = () => {
  const { data } = useCheckAuthQuery({})
  if (!data) {
  } else {
    console.log("Data:", data.email)
  }
  const [scrolled, setScrolled] = useState(false)
  const { setTheme, theme } = useTheme()
  const [isOpenMenu, setIsOpenMenu] = useState(false)
  const changeTheme = () => {
    console.log(theme);
    setTheme( theme==='light' ? 'dark' : 'light');
  }
  const handleScroll = () => {
    const offset = window.scrollY
    if (offset > 50) {
      setScrolled(true)
    } else {
      setScrolled(false)
    }
  }
  useEffect(() => {
    //add eventlistener to window
    document.addEventListener("scroll", handleScroll, { passive: true })
    // remove event on unmount to prevent a memory leak with the cleanup
    return () => {
      document.removeEventListener("scroll", handleScroll)
    }
  }, [])

  return (
    <div
      className={cn(
        "flex items-center z-60 h-16 border-b bg-background  max-w-screen-2xl ",
        scrolled ? "bg-background" : "bg-background"
      )}
    >
      <div className={"min-w-68 lg:pr-36"}>
        <Link className={"min-w-[40px] min-h-[100px]"} href={"/"}>
          {
            theme!=='dark' ?  <Image height={100} width={100} src={Logo} alt={'logo'} /> :  <Image height={100} width={100} src={LogoDark} alt={'logo'} />
          }
           </Link>
      </div>

      <Search />
      <button onClick={ () => changeTheme()}><img height={100} width={100} className={"h-8 w-8"} src={theme==='dark' ? Moon.src : Sun.src} alt="toggleTheme" /></button>
      {data ? (
        <div className={"flex items-center"}>
          <Link href={"/profile"}>
            <ProfileIcon theme={theme} user={data} />
          </Link>{" "}
          <Button className={"hidden sm:block"} onClick={() => localStorage.removeItem("token")}>
            <a href={"/"}>Выйти</a>
          </Button>
        </div>
      ) : (
        <div className={'relative'}>

              <button type="button" aria-label="Аккаунт" aria-expanded={isOpenMenu} onClick={() => setIsOpenMenu((s) => !s)} className={"bg-transparent"}>
                  <svg width="35" height="35" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g clip-path="url(#clip0_119_1313)">
                      <path d="M6.66669 36.6667C6.66669 33.1305 8.07145 29.7391 10.5719 27.2386C13.0724 24.7381 16.4638 23.3334 20 23.3334C23.5362 23.3334 26.9276 24.7381 29.4281 27.2386C31.9286 29.7391 33.3334 33.1305 33.3334 36.6667H6.66669ZM20 21.6667C14.475 21.6667 10 17.1917 10 11.6667C10 6.14169 14.475 1.66669 20 1.66669C25.525 1.66669 30 6.14169 30 11.6667C30 17.1917 25.525 21.6667 20 21.6667Z" fill="currentcolor"/>
                    </g>
                    <defs>
                      <clipPath id="clip0_119_1313">
                        <rect width="40" height="40" fill="currentcolor"/>
                      </clipPath>
                    </defs>
                  </svg>
              </button>

          {
            isOpenMenu &&
            <div className={'absolute p-2 visibleHeader right-[10px] bg-background border rounded-lg '}>
            <Button className={'block'}>
              <Link href={"/registration"}> Регистрация </Link>
            </Button>
            <AuthComponent />
            </div>
          }

        </div>
      )}
    </div>
  )
}

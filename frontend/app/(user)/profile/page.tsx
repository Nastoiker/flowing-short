"use client"
import { useCurrentUser } from '@/features/auth/use-current-user'


import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import { useGetVideosQuery } from "@/stores/slices/api"


import { LayoutVideo } from "@/components/Layot.video"
import { LayoutMusic } from "@/components/Layout.music"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Profile from "@/components/user/Profile.svg"
import Profile2 from "@/components/user/Profile2.svg"
import {useTheme} from "next-themes";
import {api_url} from "@/domen.api";

export default function IndexPage() {
  const { data } = useCurrentUser()
console.log(data)
  const { setTheme, theme } = useTheme();
  return (
    <div className={"w-full"}>
      {data ? (
        <div className={"space-y-5"}>
          <div className={"sm:flex sm:justify-between"}>
            <div
              className={
                " flex space-x-8 max-[638px]:justify-between max-[638px]: text-start"
              }
            >
              <img
                className={"rounded-full w-40 h-40"}
                width={70}
                height={70}
                alt={"userSubs"}
                src={
                  data.avatar?.length > 0
                    ? `${api_url}/user` + data.avatar
                    : theme==='light' ? Profile.src : Profile2.src
                }/>
              <div className={"my-5"}>
                <h1>{data.login}</h1>
                <h1>{data.phone}</h1>
                <p>{data.email}</p>
              </div>
            </div>
            <div className={"px-8 sm:text-end my-5"}>
              <h1>Пидписчиков: {data.subscribers_count}</h1>
              <h1>Лайков: {data.LikeCount}</h1>
              <Link href={"/folows"}>Подписки: {data.following_count}</Link>
              <Button className={"block sm:hidden  w-full max-w-[100px] bg-red-500"} onClick={() => localStorage.removeItem("token")}>
                <a href={"/"}>Выйти</a>
              </Button>
            </div>
          </div>
          <div className={"mx-5 sm:mx-0 flex flex-wrap"}>
            <Link href={"/editProfile"}>
              <Button>Изменить профиль</Button>
            </Link>
            <Link
              className={"transition-all  p-3 rounded-md "}
              href={"createMusic"}
            >
              Создать музыку
            </Link>
            <Link
              className={"transition-all  p-3 rounded-md "}
              href={"createVideo"}
            >
              Создать видео
            </Link>
            {
              data.role==='admin' &&
              <Link
                className={"transition-all text-red-600  p-3 rounded-md "}
                href={"/admin"}
              >
                Войти в админку
              </Link>
            }

          </div>
          <Tabs defaultValue="video" className="w-full sm:mx-0 mx-2">
            <TabsList>
              <TabsTrigger value="video">
                <h1>Ваши видео</h1>
              </TabsTrigger>
              <TabsTrigger value="likes">
                <h1 >Ваши лайки</h1>
              </TabsTrigger>
              <TabsTrigger value="music">
                <h1 >Ваша музыка</h1>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="video">
              <LayoutVideo videos={data.videos} user={data} />
            </TabsContent>
            <TabsContent value="music">
              <LayoutMusic user={data} musics={data.music} />
            </TabsContent>
            <TabsContent value="likes">
              <LayoutVideo
                user={data}
                videos={data.Like?.map((l) => l.videos)}
              />
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <div>
          <Link href="/authorization">Войдите в аккаунт</Link>
        </div>
      )}
    </div>
  )
}

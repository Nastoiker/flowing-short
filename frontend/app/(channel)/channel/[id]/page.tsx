import Link from "next/link"


import { IUser } from "@/types/User.interface"

import Profile from "@/components/user/Profile.svg";
import Profile2 from "@/components/user/Profile2.svg";

import axios from "axios";
import {LayoutVideoCheckUser} from "@/components/LayoutVideoCheckUser";
import {notFound} from "next/navigation";
import {api_url} from "@/domen.api";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {LayoutVideo} from "@/components/Layot.video";
import {LayoutMusic} from "@/components/Layout.music";

interface PageProps {
  params: Promise<{ id: string }>
}
async function getChannel(userId): Promise<IUser | null> {
  try {
    const res = await axios.get(`${process.env.API_INTERNAL_URL || "http://127.0.0.1:8000"}/user/` + userId, { timeout: 5000 })
    if (!res?.data) {
      return null
    }
    return await res.data;
  } catch (error) {
    return null
  }
}

export default async function PagePage({ params }: PageProps) {
  const id = (await params).id
  const data = await getChannel(id);
  if (!data) notFound();
  return (
    <div className={"w-full"}>
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
                : Profile2.src
            }
            />
            <div className={"my-5"}>
              <h1>{data.login}</h1>
              <h1>{data.phone}</h1>
              <p>{data.email}</p>
            </div>
          </div>
          <div className={"px-8 sm:text-end my-5"}>
            <h1>Подписчиков: {data.subscribers_count}</h1>
            <h1>Лайков: {data.LikeCount}</h1>
            <Link href={"/folows"}>Подписки: {data.following_count}</Link>
          </div>
        </div>
        <Tabs defaultValue="account" className="w-full sm:mx-0 mx-2">
          <TabsList>
            <TabsTrigger value="video">
              <h1>видео</h1>
            </TabsTrigger>
            <TabsTrigger value="music">
              <h1>музыка</h1>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="video">
            <LayoutVideoCheckUser videos={data.videos} />
          </TabsContent>
          <TabsContent value="music">
            <LayoutMusic musics={data.music} />
          </TabsContent>
        </Tabs>
      </div>
      {/*<div className={"border flex flex-col  rounded-xl p-2 sm:p-10 my-10"}>*/}
      {/*  <LayoutVideoCheckUser videos={data.videos} />*/}
      {/*</div>*/}
    </div>
  )
}

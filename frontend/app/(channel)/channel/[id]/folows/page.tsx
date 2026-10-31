import Link from "next/link"
import { notFound } from "next/navigation"
import { useCheckAuthQuery } from "@/stores/slices/regapi"

import { IUser } from "@/types/User.interface"
import { LayoutVideo } from "@/components/Layot.video"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {api_url} from "@/domen.api";

interface PageProps {
  params: Promise<{ id: string }>
}
async function getChannel(id: string): Promise<IUser | null> {
  try {
    const res = await fetch(`${process.env.API_INTERNAL_URL || "http://127.0.0.1:8000"}/user/` + id, { signal: AbortSignal.timeout(5000) })
    if (!res?.ok) {
      return null
    }
    return await res.json()
  } catch (error) {
    return null
  }
}

export default async function FolowsUserPage({ params }: PageProps) {
  const id = (await params).id
  const data = await getChannel(id)
  if (!data) {
    return <div></div>
  }

  return (
    <div className={"w-full"}>
      <div className={"space-y-5"}>
        <div className={"sm:flex sm:justify-between"}>
          <div
            className={
              " flex space-x-8 max-[638px]:justify-between max-[638px]: text-end"
            }
          >
            <img
              className={"rounded-full w-40 h-40"}
              width={70}
              height={70}
              alt={"userSubs"}
              src={`${api_url}/user` + data.avatar}
            />
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
          </div>
        </div>
      </div>
      <div className={"my-10"}>
        <LayoutVideo videos={data.videos} user={data} />
      </div>
    </div>
  )
}

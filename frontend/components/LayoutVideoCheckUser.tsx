"use client"
import { useCurrentUser } from '@/features/auth/use-current-user'

import {IVideo} from "@/types/Video.interface";
import {IUser} from "@/types/User.interface";
import {LayoutVideo} from "@/components/Layot.video";


export function LayoutVideoCheckUser({
                              videos,
                            }: {
  videos: IVideo[]
}) {
  const {data, error, isLoading} = useCurrentUser();
  return <>
   <LayoutVideo videos={videos} user={(!error && !isLoading) && data} />
  </>
}

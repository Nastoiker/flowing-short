"use client"
import { useCurrentUser } from '@/features/auth/use-current-user'
import { FeedList } from '@/features/video-feed/feed-list'
import { IVideo } from '@/types/Video.interface'
export function LayoutVideoCategory({videos}: {videos:IVideo[]}) {
 const {data:user}=useCurrentUser()
 return <FeedList videos={videos} user={user}/>
}

"use client"
import { useCurrentUser } from '@/features/auth/use-current-user'
import { ChannelUser } from '@/components/channel/ChannelUser'
export function LayoutChannels({channels}:{channels:any[]}) {
 const {data:user}=useCurrentUser()
 return <div className="w-full space-y-4">{channels.length?channels.map(channel=><ChannelUser key={channel.id} user={user} channel={channel}/>):<p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">Авторы не найдены</p>}</div>
}

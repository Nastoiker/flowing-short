import { IUser } from "@/types/User.interface"

export interface IVideo {
  name: string
  alias: string
  isActive: boolean
  updated_at: string
  createdAt: string
  id: string
  secondCategoryId: string
  Title: string
  duration: number
  embed_link: string
  embed_html: string
  share_url: string
  cover_image_url: string
  Description: string
  Type: string
  width: number
  height: number
  musicId: string
  share_count: number
  view_count: number
  comment_count: number
  likesCount: number
  userId: string
  music: Music | null
  tag: Tag[]
  authorVideo: AuthorVideo
  secondCategory: SecondCategory
  likes: any[]
  Comment: Comment[]
  watchers: IWatch[]
}
export interface IWatch {
  id: string
  createdAt: string
  videoId: string
  userId: string
}
export interface Music {
  id: string
  name: string
  userId: string
  alias: string
  music_url: string
}
export interface TagChild {
  id: string
  name: string
}
export interface Tag {
  videoId: string
  tagId: string
  tag: TagChild
}

export interface AuthorVideo {
  id: string
  authorUrl: string
  email: string
  login: string
  phone: string  isActive: boolean
  avatar: string
  role: string
  subscribers_count: number
  following_count: number
  LikeCount: number
  hisLikes: number
}

export interface SecondCategory {
  id: string
  name: string
  alias: string
  firstLevelId: string
}

export interface Comment {
  id: string
  createdAt: string
  likeCount: number
  pictures: any
  comment: string
  writtenById: string
  writtenBy: IUser
  videoId: string
  userComments: UserComment[]
}

export interface UserComment {
  id: string
  createdAt: string
  likeCount: number
  comment: string
  parentId: string
  userId: string
}

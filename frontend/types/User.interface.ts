import { IVideo } from "@/types/Video.interface"

export interface IUser {
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
  videos: IVideo[]
  folowing?: any[]
  folowers?: any[]
  Like: Like[]
  userComment: UserComment2[]
  music: any[]
}

export interface Video {
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
  music: Music
  tag: Tag[]
  authorVideo: AuthorVideo
  secondCategory: SecondCategory
  Comment: Comment[]
}

export interface Music {
  id: string
  name: string
  userId: string
  alias: string
  music_url: string
}

export interface Tag {
  videoId: string
  tagId: string
  tag: Tag2
}

export interface Tag2 {
  id: string
  name: string
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
  videoId: string
  writtenBy: WrittenBy
  userComments: UserComment[]
}

export interface WrittenBy {
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

export interface UserComment {
  id: string
  createdAt: string
  likeCount: number
  comment: string
  parentId: string
  userId: string
  user: User
}

export interface User {
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

export interface Like {
  id: string
  createdAt: string
  like: boolean
  likeById: string
  videoId: string
}

export interface UserComment2 {
  id: string
  createdAt: string
  likeCount: number
  comment: string
  parentId: string
  userId: string
}

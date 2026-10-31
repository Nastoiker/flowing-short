import {test, expect} from '@playwright/test'

const video = (id:string) => ({id,Title:`Story ${id}`,Description:'Social regression',embed_link:'/demo.mp4',createdAt:'2026-01-01',likesCount:8,comment_count:0,view_count:0,tag:[],music:null,authorVideo:{id:'creator',login:'Creator'},secondCategory:{name:'Shorts'}})
const viewer = {id:'viewer',login:'Viewer',Like:[],folowing:[]}

test('shared follows and authoritative likes survive client navigation without per-card auth requests',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('token','synthetic-token'))
 let authRequests=0, liked=false, likeAttempts=0
 await page.route('**/api/auth/authByJwt',route=>{authRequests++;return route.fulfill({json:viewer})})
 await page.route('**/api/Video/feed?*',route=>route.fulfill({json:{items:[video('one'),video('two')],hasMore:false,nextOffset:null}}))
 await page.route('**/api/creators?*',route=>route.fulfill({json:[]}))
 await page.route('**/api/user/followChannel',route=>route.fulfill({json:{id:'relation',userId:'viewer',authorId:'creator'}}))
 await page.route('**/api/user/unfollowChannel',route=>route.fulfill({json:{count:1}}))
 // A concurrent session had already liked: server says false despite the stale initial auth snapshot.
 await page.route('**/api/user/likeVideo',route=>{if(++likeAttempts===3)return route.fulfill({status:503,json:{message:'Unavailable'}});const response={id:'like',videoId:'one',likeById:'viewer',like:liked,likesCount:liked?8:7};liked=!liked;return route.fulfill({json:response})})
 await page.goto('/')
 const first=page.locator('article[data-video-id="one"]'), second=page.locator('article[data-video-id="two"]')
 await first.getByRole('button',{name:'Подписаться',exact:true}).click()
 await expect(second.getByRole('button',{name:'Отписаться',exact:true})).toBeAttached()
 await first.getByRole('button',{name:'Нравится',exact:true}).click()
 await expect(first.getByRole('button',{name:'Нравится',exact:true})).toHaveAttribute('aria-pressed','false')
 await expect(first.getByRole('button',{name:'Нравится',exact:true})).toHaveText('7')
 await first.getByRole('button',{name:'Нравится',exact:true}).click()
 await expect(first.getByRole('button',{name:'Нравится',exact:true})).toHaveAttribute('aria-pressed','true')
 await first.getByRole('button',{name:'Нравится',exact:true}).click()
 await expect(first.getByRole('alert')).toContainText('Не удалось сохранить лайк')
 await expect(first.getByRole('button',{name:'Нравится',exact:true})).toHaveText('8')
 await expect(first.getByRole('button',{name:'Нравится',exact:true})).toHaveAttribute('aria-pressed','true')
 if(await page.getByRole('button',{name:'Открыть категории'}).isVisible()) await page.getByRole('button',{name:'Открыть категории'}).click()
 await page.getByRole('link',{name:'Авторы',exact:true}).click()
 await expect(page).toHaveURL(/\/creators$/)
 await page.getByRole('link',{name:'logo',exact:true}).click()
 await expect(first.getByRole('button',{name:'Нравится',exact:true})).toHaveAttribute('aria-pressed','true')
 await expect(second.getByRole('button',{name:'Отписаться',exact:true})).toBeAttached()
 await second.getByRole('button',{name:'Отписаться',exact:true}).click()
 await expect(first.getByRole('button',{name:'Подписаться',exact:true})).toBeAttached()
 expect(authRequests).toBe(1)
})

test('comment updates an earlier page counter and a fresh feed replaces cached metrics',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('token','synthetic-token'))
 await page.route('**/api/auth/authByJwt',route=>route.fulfill({json:viewer}))
 let commented=false
 await page.route('**/api/Video/feed?*',route=>{
  const params=new URL(route.request().url()).searchParams
  const earlier={...video('one'),comment_count:commented?2:0}
  return route.fulfill({json:params.get('sort')==='popular'?{items:[earlier],hasMore:false,nextOffset:null}:params.get('offset')==='12'?{items:[video('two')],hasMore:false,nextOffset:null}:{items:[earlier],hasMore:true,nextOffset:12}})
 })
 await page.route('**/api/video/comments/*',route=>route.fulfill({json:[]}))
 await page.route('**/api/user/createComment',route=>{commented=true;return route.fulfill({json:{id:'comment',videoId:'one',videoCommentCount:1}})})
 await page.goto('/')
 await page.getByRole('button',{name:'Показать ещё'}).click()
 await expect(page.locator('article[data-video-id]')).toHaveCount(2)
 const first=page.locator('article[data-video-id="one"]')
 await first.getByRole('button',{name:'Комментарии',exact:true}).click()
 await first.getByLabel('Ваш комментарий').fill('Synthetic comment')
 await first.getByRole('button',{name:'Отправить комментарий'}).click()
 await expect(first.getByRole('button',{name:'Комментарии',exact:true})).toHaveText('1')
 await page.getByLabel('Сортировка ленты').selectOption('popular')
 await expect(first.getByRole('button',{name:'Комментарии',exact:true})).toHaveText('2')
 await page.reload()
 await expect(first.getByRole('button',{name:'Комментарии',exact:true})).toHaveText('2')
})

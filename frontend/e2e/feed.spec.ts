import {test, expect} from '@playwright/test'

const fixture = (id:string,title:string) => ({id,Title:title,Description:'Feed regression fixture',embed_link:'/demo.mp4',createdAt:'2026-01-01T00:00:00Z',likesCount:0,view_count:0,comment_count:0,music:null,tag:[],authorVideo:{id:'demo-user',login:'Demo creator',avatar:null},secondCategory:{name:'Shorts',alias:'shorts'}})

test('feed paginates without duplicates, retries a failed page, and resets when sorting changes', async ({page})=>{
 let fail=true
 const requests:string[]=[]
 await page.route('**/api/Video/feed?*',route=>{
  const params=new URL(route.request().url()).searchParams
  requests.push(params.toString())
  if(params.get('sort')==='popular') return route.fulfill({json:{items:[fixture('popular','Popular story')],hasMore:false,nextOffset:null}})
  if(params.get('offset')==='12') {
   if(fail){fail=false;return route.fulfill({status:503,json:{message:'Temporary outage'}})}
   return route.fulfill({json:{items:[fixture('one','First story'),fixture('two','Second story')],hasMore:false,nextOffset:null}})
  }
  return route.fulfill({json:{items:[fixture('one','First story')],hasMore:true,nextOffset:12}})
 })
 await page.goto('/')
 await expect(page.getByLabel('First story',{exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Показать ещё'}).click()
 await expect(page.getByRole('main').getByRole('alert')).toContainText('следующую страницу')
 await expect(page.getByLabel('First story',{exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Повторить загрузку'}).click()
 await expect(page.locator('article[data-video-id]')).toHaveCount(2)
 await expect(page.getByLabel('Second story',{exact:true})).toBeVisible()
 await page.getByLabel('Сортировка ленты').selectOption('popular')
 await expect(page.locator('article[data-video-id]')).toHaveCount(1)
 await expect(page.getByLabel('Popular story',{exact:true})).toBeVisible()
 expect(requests.some(query=>query.includes('offset=12'))).toBe(true)
 expect(requests.at(-1)).toContain('offset=0')
})

test('anonymous feed skips auth, follows and report dictionaries until requested', async ({page})=>{
 const protectedRequests:string[]=[]
 page.on('request',request=>{if(/authByJwt|\/user\/follows|\/report\/reports/.test(request.url()))protectedRequests.push(request.url())})
 await page.route('**/api/Video/feed?*',route=>route.fulfill({json:{items:[fixture('one','First story')],hasMore:false,nextOffset:null}}))
 await page.goto('/')
 await expect(page.getByLabel('First story',{exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Пожаловаться на видео'}).click()
 await expect(page.getByRole('link',{name:'Войдите, чтобы отправить жалобу'})).toBeVisible()
 expect(protectedRequests).toEqual([])
})

test('starting another video and leaving the viewport pauses the previous player',async({page})=>{
 await page.route('**/api/Video/feed?*',route=>route.fulfill({json:{items:[fixture('one','First story'),fixture('two','Second story')],hasMore:false,nextOffset:null}}))
 await page.route('**/api/Video/videoWatch',route=>route.fulfill({json:{}}))
 await page.goto('/')
 const first=page.getByLabel('First story',{exact:true}), second=page.getByLabel('Second story',{exact:true})
 await first.click({position:{x:100,y:180}})
 await expect.poll(()=>first.evaluate((v:HTMLVideoElement)=>v.paused)).toBe(false)
 await second.scrollIntoViewIfNeeded()
 await second.click({position:{x:100,y:180}})
 await expect.poll(()=>second.evaluate((v:HTMLVideoElement)=>v.paused)).toBe(false)
 await expect.poll(()=>first.evaluate((v:HTMLVideoElement)=>v.paused)).toBe(true)
})

test('a delayed play completion cannot revive a player after it leaves the viewport',async({page})=>{
 await page.addInitScript(()=>{
  const original=HTMLMediaElement.prototype.play
  HTMLMediaElement.prototype.play=function(){
   const started=original.call(this)
   return started.then(()=>new Promise<void>(resolve=>{(window as any).finishPendingPlay=resolve}))
  }
 })
 await page.route('**/api/Video/feed?*',route=>route.fulfill({json:{items:[fixture('one','First story'),fixture('two','Second story')],hasMore:false,nextOffset:null}}))
 await page.goto('/')
 const first=page.getByLabel('First story',{exact:true})
 await first.click({position:{x:100,y:180}})
 await expect.poll(()=>page.evaluate(()=>typeof (window as any).finishPendingPlay)).toBe('function')
 await page.getByLabel('Second story',{exact:true}).scrollIntoViewIfNeeded()
 await expect.poll(()=>first.evaluate((v:HTMLVideoElement)=>v.paused)).toBe(true)
 await page.evaluate(()=>(window as any).finishPendingPlay())
 await expect(page.getByRole('button',{name:'Воспроизвести: First story',exact:true})).toBeAttached()
 await expect.poll(()=>first.evaluate((v:HTMLVideoElement)=>v.paused)).toBe(true)
})

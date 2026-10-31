import {test,expect} from '@playwright/test'

test('creators directory handles an API failure, retries, and links to a channel',async({page})=>{
 let fail=true
 const displayName='Directory author with a very long uninterrupted name '+ 'x'.repeat(60)
 await page.route('**/api/creators?*',route=>{
  if(fail){fail=false;return route.fulfill({status:503,json:{message:'unavailable'}})}
  return route.fulfill({json:[{userId:'demo-user',displayName,authorUrl:'demo',avatar:null,registeredAt:'2026-01-01T00:00:00Z'}]})
 })
 await page.goto('/creators')
 await expect(page.getByRole('heading',{name:'Авторы',exact:true})).toBeVisible()
 await expect(page.getByRole('main').getByRole('alert')).toContainText('Не удалось загрузить авторов')
 await page.getByRole('button',{name:'Повторить',exact:true}).click()
 await expect(page.getByRole('link',{name:`${displayName} Открыть канал →`})).toHaveAttribute('href','/channel/demo-user')
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('creators directory displays a registered author after event projection',async({page,request},info)=>{
 const displayName=`Directory ${info.project.name} ${Date.now()}`
 const response=await request.post('/api/auth/register',{data:{email:`directory-${info.project.name}-${Date.now()}@example.test`,login:displayName,hashpassword:'TestPassword123!'}})
 expect(response.ok()).toBeTruthy()
 const author=await response.json()
 // The directory intentionally contains only the newest 30 authors; never depend on an old seed staying in that window.
 await expect.poll(async()=>{
  const projection=await request.get('/api/creators?limit=30')
  return (await projection.json()).some((item:{userId:string})=>item.userId===author.id)
 },{timeout:20000}).toBe(true)
 await page.goto('/creators')
 await page.getByRole('main').getByRole('link',{name:`${displayName} Открыть канал →`}).click()
 await expect(page).toHaveURL(new RegExp(`/channel/${author.id}$`))
})

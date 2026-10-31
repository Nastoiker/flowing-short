import {test,expect} from '@playwright/test'

test('creators directory handles an API failure, retries, and links to a channel',async({page})=>{
 let fail=true
 await page.route('**/api/creators?*',route=>{
  if(fail){fail=false;return route.fulfill({status:503,json:{message:'unavailable'}})}
  return route.fulfill({json:[{userId:'demo-user',displayName:'Directory author',authorUrl:'demo',avatar:null,registeredAt:'2026-01-01T00:00:00Z'}]})
 })
 await page.goto('/creators')
 await expect(page.getByRole('heading',{name:'Авторы',exact:true})).toBeVisible()
 await expect(page.getByRole('main').getByRole('alert')).toContainText('Не удалось загрузить авторов')
 await page.getByRole('button',{name:'Повторить',exact:true}).click()
 await expect(page.getByRole('link',{name:'Directory author Открыть канал →'})).toHaveAttribute('href','/channel/demo-user')
})

test('creators directory displays the seeded author projection',async({page})=>{
 await page.goto('/creators')
 await expect(page.getByRole('main').getByText('Demo creator',{exact:true})).toBeVisible({timeout:20000})
 await page.getByRole('main').getByRole('link',{name:/Demo creator/}).click()
 await expect(page).toHaveURL(/channel\/demo-user$/)
})

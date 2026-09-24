import {test,expect} from '@playwright/test';
import {readJsonBody,RequestBodyError} from '../src/lib/request-body';
test('JSON parser rejects malformed, non-JSON, and oversized bodies',async()=>{
 const request=(body:string,type='application/json')=>new Request('https://example.test',{method:'POST',headers:{'Content-Type':type},body});
 await expect(readJsonBody(request('{'))).rejects.toMatchObject({status:400});
 await expect(readJsonBody(request('{}','text/plain'))).rejects.toMatchObject({status:415});
 await expect(readJsonBody(request('x'.repeat(100)),20)).rejects.toBeInstanceOf(RequestBodyError);
 await expect(readJsonBody(request('x'.repeat(100)),20)).rejects.toMatchObject({status:413});
 await expect(readJsonBody(request('{"name":"Student"}'))).resolves.toEqual({name:'Student'});
});
test('application and dashboard provide safe official update links',async({page})=>{
 for(const route of ['/apply','/preview']){await page.goto(route);const updates=page.getByRole('region',{name:'Interview and club updates'});await expect(updates).toBeVisible();await expect(updates.getByRole('link',{name:'Follow on Instagram'})).toHaveAttribute('href','https://www.instagram.com/ai_nexus_pu?stkn=MTQ0cTVkaWp3ajhmNQ==');await expect(updates.getByRole('link',{name:'Join WhatsApp channel'})).toHaveAttribute('rel','noopener noreferrer');}
 await page.setViewportSize({width:320,height:844});await page.goto('/apply');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('public handlers fail safely and protect private routes',async({request})=>{
 const origin={Origin:'http://localhost:3000','Content-Type':'application/json'};
 const bad=await request.post('/api/applications',{headers:origin,data:Buffer.from('{')});expect(bad.status()).toBe(400);expect(await bad.json()).toEqual({error:'Invalid JSON request.'});
 const large=await request.post('/api/applications',{headers:origin,data:JSON.stringify({name:'x'.repeat(40000)})});expect(large.status()).toBe(413);
 const auth=await request.post('/api/auth/session',{headers:origin,data:{idToken:'invalid'}});expect(auth.status()).toBe(401);expect(await auth.text()).not.toMatch(/firebase-admin|jose|node_modules|Decoding Firebase/);
 const privateRecords=await request.get('/api/portal/users');expect(privateRecords.status()).toBe(401);
 const csrf=await request.post('/api/applications',{headers:{...origin,Origin:'https://attacker.invalid'},data:{}});expect(csrf.status()).toBe(403);
});

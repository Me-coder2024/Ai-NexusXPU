'use server';
import {cookies} from 'next/headers';
import {POST} from '@/app/api/auth/session/route';
export async function establishSession(idToken:string){
 // Server Actions validate the browser Origin and invalidate the router cookie cache.
 const response=await POST(new Request('https://session.internal/api/auth/session',{method:'POST',headers:{origin:'https://session.internal','content-type':'application/json'},body:JSON.stringify({idToken})}));
 const data=await response.json();
 if(!response.ok)throw new Error(data.error||'Unable to sign in.');
 const session=response.cookies.get('nexus-session');
 if(!session)throw new Error('Unable to create your session.');
 (await cookies()).set(session);
 return data as {redirect:string};
}
export async function endSession(){(await cookies()).delete('nexus-session')}

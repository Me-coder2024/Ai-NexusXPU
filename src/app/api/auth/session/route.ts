import {NextResponse} from 'next/server';
import {verifyToken,sameOrigin} from '@/lib/auth';
import {db,databaseConfigured} from '@/lib/db';
import {universityEmail} from '@/lib/permissions';
export const runtime='nodejs';
export async function POST(request:Request){
  try{
    if(!sameOrigin(request))return NextResponse.json({error:'Invalid request origin.'},{status:403});
    if(!databaseConfigured())return NextResponse.json({error:'Google sign-in is ready, but the club database still needs to be connected. Please contact the club administrator.'},{status:503});
    const body=await request.text();
    if(!body)return NextResponse.json({error:'Empty request body.'},{status:400});
    const{idToken}=JSON.parse(body);
    if(typeof idToken!=='string'||idToken.length>10000)return NextResponse.json({error:'Invalid sign-in token.'},{status:400});
    const identity=await verifyToken(idToken);
    const email=identity.email!.toLowerCase();
    const client=db();
    const{data:existing,error:lookupError}=await client.from('users').select('*').eq('email',email).maybeSingle();
    if(lookupError)return NextResponse.json({error:'Database lookup failed: '+lookupError.message},{status:500});
    if(existing?.disabled)return NextResponse.json({error:'This account is disabled. Contact the club administrator.'},{status:403});

    // Existing user — let them in
    if(existing){
      const response=NextResponse.json({user:{name:existing.name,roles:existing.roles},redirect:'/portal'});
      response.cookies.set('nexus-session',idToken,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:Math.max(0,Math.min(3600,identity.exp-Math.floor(Date.now()/1000)))});
      return response;
    }

    // New user — only auto-create if they have a university email
    if(!universityEmail(email)){
      return NextResponse.json({error:'No account found for this email. If you applied with a personal email, your admin must first add you. Students with @paruluniversity.ac.in can sign in directly.'},{status:403});
    }

    const{data:newUser,error:insertError}=await client.from('users').insert({email,name:identity.name||email.split('@')[0],firebase_uid:identity.uid,roles:['STUDENT']}).select().single();
    if(insertError)return NextResponse.json({error:'Could not create account: '+insertError.message},{status:500});
    const response=NextResponse.json({user:{name:newUser.name,roles:newUser.roles},redirect:'/portal'});
    response.cookies.set('nexus-session',idToken,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:Math.max(0,Math.min(3600,identity.exp-Math.floor(Date.now()/1000)))});
    return response;
  }catch(e){
    const msg=e instanceof Error?e.message:'Sign-in could not be completed.';
    return NextResponse.json({error:msg},{status:401});
  }
}
export async function DELETE(request:Request){
  try{
    if(!sameOrigin(request))return NextResponse.json({error:'Invalid request origin.'},{status:403});
    const response=NextResponse.json({ok:true});
    response.cookies.set('nexus-session','',{httpOnly:true,maxAge:0,path:'/'});
    return response;
  }catch{return NextResponse.json({error:'Sign-out failed.'},{status:500})}
}

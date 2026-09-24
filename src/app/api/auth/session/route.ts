import {readJsonBody,RequestBodyError} from '@/lib/request-body';
import {NextResponse} from 'next/server';
import {verifyToken,sameOrigin} from '@/lib/auth';
import {db,databaseConfigured} from '@/lib/db';
import {universityEmail} from '@/lib/permissions';
export const runtime='nodejs';
export async function POST(request:Request){
  try{
    if(!sameOrigin(request))return NextResponse.json({error:'Invalid request origin.'},{status:403});
    if(!databaseConfigured())return NextResponse.json({error:'Google sign-in is ready, but the club database still needs to be connected. Please contact the club administrator.'},{status:503});
    const body=await readJsonBody(request,16384);
    const idToken=body&&typeof body==='object'&&'idToken' in body?body.idToken:undefined;
    if(typeof idToken!=='string'||idToken.length>10000)return NextResponse.json({error:'Invalid sign-in token.'},{status:400});
    const identity=await verifyToken(idToken);
    const email=identity.email!.toLowerCase();
    const client=db();
    const{data:existing,error:lookupError}=await client.from('users').select('*').eq('email',email).maybeSingle();
    if(lookupError)return NextResponse.json({error:'Unable to load your account. Please try again shortly.'},{status:500});
    if(existing?.disabled)return NextResponse.json({error:'This account is disabled. Contact the club administrator.'},{status:403});

    // Existing user — let them in
    if(existing){
      const response=NextResponse.json({user:{name:existing.name,roles:existing.roles},redirect:'/portal'});
      response.cookies.set('nexus-session',idToken,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:Math.max(0,Math.min(3600,identity.exp-Math.floor(Date.now()/1000)))});
      return response;
    }

    // Preserve the applicant journey, including first-year personal-email applicants,
    // but only create the account after Google has verified ownership of that email.
    const{data:application,error:applicationError}=await client.from('applications').select('name,enrollment,email,details').eq('email',email).maybeSingle();
    if(applicationError)return NextResponse.json({error:'Unable to check your application. Please try again shortly.'},{status:503});
    if(!universityEmail(email)&&!application){
      return NextResponse.json({error:'Apply with this email first, or sign in with your @paruluniversity.ac.in Google account.'},{status:403});
    }

    const{data:newUser,error:insertError}=await client.from('users').insert({email,name:application?.name||identity.name||email.split('@')[0],firebase_uid:identity.uid,roles:['STUDENT']}).select().single();
    if(insertError)return NextResponse.json({error:'Unable to prepare your account. Please try again shortly.'},{status:500});
    if(application){
      const details=application.details||{};
      const{error:profileError}=await client.from('student_profiles').insert({id:newUser.id,name:application.name,enrollment:application.enrollment,email,department:details.department||'',year:details.year||'',details});
      if(profileError)console.error('Applicant profile initialization failed',{code:profileError.code});
    }
    const response=NextResponse.json({user:{name:newUser.name,roles:newUser.roles},redirect:'/portal'});
    response.cookies.set('nexus-session',idToken,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:Math.max(0,Math.min(3600,identity.exp-Math.floor(Date.now()/1000)))});
    return response;
  }catch(e){
    if(e instanceof RequestBodyError)return NextResponse.json({error:e.message},{status:e.status});
    console.error('Sign-in verification failed',{code:e&&typeof e==='object'&&'code' in e?e.code:'unknown'});
    return NextResponse.json({error:'Unable to verify this sign-in. Please sign in with Google again.'},{status:401});
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

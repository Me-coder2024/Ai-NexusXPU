import {NextResponse} from 'next/server';
import {db,databaseConfigured} from '@/lib/db';
import {sameOrigin} from '@/lib/request-origin';
import {applicationSchema} from '@/lib/validation';
export const runtime='nodejs';
export async function POST(request:Request){
  try{
    if(!sameOrigin(request))return NextResponse.json({error:'Invalid request origin.'},{status:403});
    if(!databaseConfigured())return NextResponse.json({error:'Applications will open when the club database is connected.'},{status:503});
    const body=await request.text();
    if(!body)return NextResponse.json({error:'Empty request body.'},{status:400});
    const parsed=JSON.parse(body);
    const result=applicationSchema.safeParse(parsed);
    if(!result.success)return NextResponse.json({error:result.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join(' ')},{status:400});
    const{name,enrollment,email,personalEmail,...details}=result.data;
    const contactEmail=(email&&email!==''?email:personalEmail||'').toLowerCase();
    const client=db();

    // Insert application
    const{data:app,error:appError}=await client.from('applications').insert({
      name,enrollment,email:contactEmail,
      details:{...details,universityEmail:email||'',personalEmail:personalEmail||''}
    }).select('id').single();
    if(appError){
      if(appError.code==='23505')return NextResponse.json({error:'An application already exists for this enrollment number or email.'},{status:409});
      return NextResponse.json({error:'Application insert failed: '+appError.message},{status:500});
    }

    // Auto-create student user account for portal access (best-effort, don't crash if it fails)
    try{
      const{data:existingUser}=await client.from('users').select('id').eq('email',contactEmail).maybeSingle();
      if(!existingUser){
        const{data:newUser}=await client.from('users').insert({
          email:contactEmail,name,roles:['STUDENT'],permissions:{},disabled:false
        }).select('id').single();
        if(newUser){
          await client.from('student_profiles').insert({
            id:newUser.id,name,enrollment,email:contactEmail,
            department:details.department||'',year:result.data.year,
            details:{institute:details.institute||'',division:details.division||'',semester:details.semester||'',skillLevel:details.skillLevel||'',personalEmail:personalEmail||'',universityEmail:email||''}
          });
        }
      }
    }catch{/* user/profile creation is best-effort; application was already saved */}

    return NextResponse.json({id:app.id},{status:201});
  }catch(e){
    const msg=e instanceof Error?e.message:'Unable to submit this application.';
    return NextResponse.json({error:msg},{status:500});
  }
}

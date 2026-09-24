import {readJsonBody,RequestBodyError} from '@/lib/request-body';
import {NextResponse} from 'next/server';
import {db,databaseConfigured} from '@/lib/db';
import {sameOrigin} from '@/lib/request-origin';
import {applicationSchema} from '@/lib/validation';
export const runtime='nodejs';
export async function POST(request:Request){
  try{
    if(!sameOrigin(request))return NextResponse.json({error:'Invalid request origin.'},{status:403});
    if(!databaseConfigured())return NextResponse.json({error:'Applications will open when the club database is connected.'},{status:503});
    const parsed=await readJsonBody(request);
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
      console.error('Application database failure', {code:appError.code});
      return NextResponse.json({error:'Application could not be saved. Please try again shortly.'},{status:503});
    }

    // Public applications do not grant account access. Google login verifies identity first.
    return NextResponse.json({id:app.id},{status:201});
  }catch(e){
    if(e instanceof RequestBodyError)return NextResponse.json({error:e.message},{status:e.status});
    console.error('Application submission failed');
    return NextResponse.json({error:'Application could not be saved. Please try again shortly.'},{status:500});
  }
}

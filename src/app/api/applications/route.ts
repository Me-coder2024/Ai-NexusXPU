import {NextResponse} from 'next/server';
import {db,databaseConfigured} from '@/lib/db';
import {sameOrigin} from '@/lib/auth';
import {applicationSchema} from '@/lib/validation';
export async function POST(request:Request){
  if(!sameOrigin(request))return NextResponse.json({error:'Invalid request origin.'},{status:403});
  if(!databaseConfigured())return NextResponse.json({error:'Applications will open when the club database is connected. Your form has not been submitted.'},{status:503});
  try{
    const result=applicationSchema.safeParse(await request.json());
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
      return NextResponse.json({error:'Applications are not available yet. Please contact the club team. Your form has not been submitted.'},{status:503});
    }

    // Auto-create student user account for portal access
    // Skip if user already exists (e.g. re-applying with same email)
    const{data:existingUser}=await client.from('users').select('id').eq('email',contactEmail).maybeSingle();
    if(!existingUser){
      // Create user and get their ID back
      const{data:newUser,error:userError}=await client.from('users').insert({
        email:contactEmail,
        name,
        roles:['STUDENT'],
        permissions:{},
        disabled:false
      }).select('id').single();

      // Create student profile linked to the user (only if user was created)
      if(!userError&&newUser){
        await client.from('student_profiles').insert({
          id:newUser.id,
          name,enrollment,email:contactEmail,
          department:details.department||'',
          year:result.data.year,
          details:{institute:details.institute||'',division:details.division||'',semester:details.semester||'',skillLevel:details.skillLevel||'',personalEmail:personalEmail||'',universityEmail:email||''}
        });
      }
    }

    return NextResponse.json({id:app.id},{status:201});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to submit this application. Please try again.'},{status:400})}
}

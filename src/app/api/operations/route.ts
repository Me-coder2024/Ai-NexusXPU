import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getMember,sameOrigin} from '@/lib/auth';
import {db} from '@/lib/db';
import {can,isAdmin,portalRole} from '@/lib/permissions';
import {readJsonBody,RequestBodyError} from '@/lib/request-body';
const fail=(error:string,status=400)=>NextResponse.json({error},{status});
const id=z.string().uuid(), text=z.string().trim().min(1).max(200), notes=z.string().trim().min(1).max(5000);
const schemas={
 limit:z.object({year:z.coerce.number().int().min(1).max(6),capacity:z.coerce.number().int().min(1).max(10000)}),
 batch:z.object({id:id.optional(),title:text,code:text,year:z.coerce.number().int().min(1).max(6),capacity:z.coerce.number().int().min(1).max(1000),core:z.array(id).max(50),faculty:z.array(id).max(50),schedule:z.string().max(500),room:z.string().max(200)}),
 schedule:z.object({id,slot:z.string().datetime(),room:text,panel:text}),
 review:z.object({id,recommendation:z.enum(['Recommended','Not Recommended','Hold']),score:z.coerce.number().min(0).max(100),notes}),
 finalize:z.object({id,decision:z.enum(['Selected','Waitlisted','Rejected']),batch:id.optional(),notes:z.string().max(5000)}),
 attendance:z.object({batch:id,session:text,date:z.iso.date(),records:z.array(z.object({student_id:id,status:z.enum(['Present','Absent'])})).min(1).max(1000)}),
 task:z.object({title:text,description:z.string().max(5000),assignee:id,module:z.enum(['events','media','research','industry','esports','students','attendance']),event:z.union([id,z.literal('')]),deadline:z.union([z.iso.date(),z.literal('')])}),
 task_status:z.object({id,status:z.enum(['To do','In progress','Done'])}),
 progress:z.object({id,completed:z.boolean()}),
 feedback:z.object({student:id,title:text,remarks:notes,decision:z.enum(['Feedback','Approved','Changes requested'])})
};
export async function POST(request:Request){
 if(!sameOrigin(request))return fail('Invalid request origin.',403);
 const member=await getMember();if(!member)return fail('Please sign in again.',401);
 try{
  const body=z.object({action:z.enum(['limit','batch','schedule','review','finalize','attendance','task','task_status','progress','feedback']),data:z.unknown()}).parse(await readJsonBody(request,150000));
  const allowed=isAdmin(member)||(['review','schedule'].includes(body.action)&&can(member,'applications','edit')&&can(member,'interviews','edit'))||(body.action==='attendance'&&can(member,'attendance','edit'))||(body.action==='task_status'&&can(member,'tasks','edit'))||(body.action==='progress'&&can(member,'progress','edit'))||(body.action==='feedback'&&can(member,'feedback','create'));
  if(!allowed)return fail('You do not have permission for this action.',403);
  const data=schemas[body.action].parse(body.data);
  if(body.action==='schedule'){
   const input=schemas.schedule.parse(data),client=db();
   const {data:app,error:appError}=await client.from('applications').select('id,status,finalized_by').eq('id',input.id).single();if(appError||!app||app.finalized_by||['Selected','Rejected'].includes(app.status))return fail('This application cannot be scheduled.');
   const {data:old,error:oldError}=await client.from('interviews').select('id,status').eq('application_id',input.id).eq('round',1).maybeSingle();if(oldError)return fail('Could not load interview.',503);if(old)return fail('The first interview is already scheduled or completed. Record its evaluation below.');
   const {error}=await client.rpc('mutate_record',{p_table:'interviews',p_action:'create',p_id:null,p_actor:member.id,p_data:{application_id:input.id,round:1,slot:input.slot,room:input.room,panel:input.panel,status:'Scheduled'}});if(error)return fail('Could not save interview schedule.',503);return NextResponse.json({ok:true});
  }
  const result=await db().rpc('club_operation',{p_actor:member.id,p_action:body.action,p_data:data});
  if(result.error){if(result.error.code==='P0001')return fail(result.error.message);if(result.error.code==='23505')return fail('This record already exists. Check the email, enrollment number or batch code.');if(result.error.code==='PGRST202')return fail('The club workflow database upgrade is pending. Ask Admin to apply migration 003.',503);console.error('Club operation failed',{action:body.action,code:result.error.code});return fail('This change could not be saved. Existing records have been preserved.',503)}
  return NextResponse.json({ok:true,record:result.data});
 }catch(error){if(error instanceof RequestBodyError)return fail(error.message,error.status);return fail(error instanceof z.ZodError?'Please complete all required fields with valid values.':'Unable to save this change. Please try again.')}
}
export async function GET(request:Request){
 const member=await getMember();if(!member)return fail('Please sign in again.',401);
 const view=new URL(request.url).searchParams.get('view')||'overview';
 if(!['overview','applications','interviews','batches','attendance','tasks','progress','feedback','users','team'].includes(view)||!can(member,view))return fail('Access denied.',403);
 const client=db(),admin=isAdmin(member),role=portalRole(member);
 const scopedRole=(module:string)=>member.roles.includes('STUDENT')&&!can({...member,roles:member.roles.filter(r=>r!=='STUDENT')},module)?'student':role;
 try{
  const result:Record<string,unknown>={};
  if(view==='overview'&&role==='faculty'){const {count,error}=await client.from('student_profiles').select('id',{count:'exact',head:true});if(error)throw error;result.stats=[{students:count||0}];}
  const read=async(key:string,query:PromiseLike<{data:unknown;error:unknown}>)=>{const response=await query;if(response.error)throw response.error;result[key]=response.data||[];return response.data as Record<string,unknown>[]};
  if(view==='users'||view==='team'){await read('users',client.from('users').select('id,name,email,roles,permissions,disabled').order('name'));return NextResponse.json(result)}
  if(['overview','applications','interviews'].includes(view)&&can(member,'applications')){
   const applicationRole=scopedRole('applications');
   const fields=applicationRole==='student'?'id,name,enrollment,status,program,batch_id,created_at':'*';
   let query=client.from('applications').select(fields).order('created_at',{ascending:false});
   if(applicationRole==='student')query=query.eq('email',member.email);
   const apps=await read('applications',query);
   if(applicationRole==='student')await read('interviews',client.from('interviews').select('id,application_id,round,slot,room,status').in('application_id',apps.map(a=>a.id)));
   else if(can(member,'interviews'))await read('interviews',client.from('interviews').select('*').in('application_id',apps.map(a=>a.id)));
  }
  if(['overview','batches','attendance','progress','applications','interviews'].includes(view)&&(can(member,'batches')||view==='attendance'||view==='progress')){
   const batchRole=scopedRole(view==='attendance'?'attendance':'batches');
   let query=client.from('batches').select('*').order('created_at',{ascending:false});
   if(batchRole==='student'){const memberships=await client.from('batch_members').select('batch_id').eq('student_id',member.id);if(memberships.error)throw memberships.error;query=query.in('id',(memberships.data||[]).map(r=>r.batch_id))}
   else if(batchRole==='core-team')query=query.contains('core_member_ids',[member.id]);
   const batches=await read('batches',query);
   const ids=batches.map(b=>b.id);
   if(admin)await read('limits',client.from('intake_limits').select('*').order('academic_year'));
   if(['batches','attendance','progress'].includes(view)||admin){
    let rosterQuery=client.from('batch_members').select('batch_id,student_id,student:users!student_id(id,name,email)').in('batch_id',ids);
    if(batchRole==='student')rosterQuery=rosterQuery.eq('student_id',member.id);
    await read('roster',rosterQuery);
   }
   if(view==='attendance'||(view==='overview'&&batchRole==='student')){
    let attendance=client.from('attendance').select('*').order('date',{ascending:false});
    if(scopedRole('attendance')==='student')attendance=attendance.eq('student_id',member.id);else if(!admin&&role==='core-team')attendance=attendance.in('batch_id',ids);
    await read('attendance',attendance);
   }
   if(view==='progress'){
    let syllabus=client.from('syllabus').select('*').in('batch_id',ids).order('module_number');if(scopedRole('progress')==='student')syllabus=syllabus.in('status',['Active','Completed']);const lessons=await read('syllabus',syllabus);
    let progress=client.from('learning_progress').select('*').in('syllabus_id',lessons.map(l=>l.id));if(scopedRole('progress')==='student')progress=progress.eq('student_id',member.id);
    await read('progress',progress);
   }
  }
  if(view==='tasks'||(view==='overview'&&(admin||role==='core-team'))){let query=client.from('club_tasks').select('*').order('deadline',{ascending:true,nullsFirst:false});if(!admin)query=query.eq('assignee_id',member.id);await read('tasks',query);if(admin)await read('events',client.from('events').select('id,title').order('starts_at'))}
  if(view==='feedback'){
   let query=client.from('faculty_feedback').select('*').order('created_at',{ascending:false});if(scopedRole('feedback')==='student')query=query.eq('student_id',member.id);await read('feedback',query);
   if(can(member,'feedback','create'))await read('students',client.from('student_profiles').select('id,name,enrollment'));
  }
  if(admin&&['batches','tasks'].includes(view))await read('staff',client.from('users').select('id,name,email,roles').eq('disabled',false).overlaps('roles',['CORE_TEAM','CLUB_LEAD','FACULTY']));
  return NextResponse.json(result);
 }catch(error){console.error('Club workspace read failed',{view,code:error&&typeof error==='object'&&'code' in error?error.code:'unknown'});return fail('The club workspace could not load. If migration 003 has not been applied, ask Admin to run the database upgrade. Your existing records are safe.',503)}
}

import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getMember,sameOrigin} from '@/lib/auth';
import {db} from '@/lib/db';
import {can,ROLES,universityEmail,type Member} from '@/lib/permissions';
import {configs} from '@/lib/module-config';
const fail=(message:string,status=400)=>NextResponse.json({error:message},{status});
function studentScope(user:Member,module:string){return user.roles.includes('STUDENT')&&!can({...user,roles:user.roles.filter(r=>r!=='STUDENT')},module)}
async function batchIds(user:Member){const{data,error}=await db().from('batch_members').select('batch_id').eq('student_id',user.id);if(error)throw error;return(data||[]).map(r=>r.batch_id)}
export async function GET(request:Request,{params}:{params:Promise<{module:string}>}){const user=await getMember();if(!user)return fail('Please sign in again.',401);const{module}=await params;if(!can(user,module))return fail('You do not have access to this module.',403);const client=db();try{
 if(module==='overview'||module==='analytics'){
 const scopes=['students','batches','events','applications','research','registrations'].filter(m=>can(user,m));const counts:Record<string,number>={};for(const m of scopes){let query=client.from(configs[m].table).select('id',{count:'exact',head:true});if(studentScope(user,m)){if(m==='applications')query=query.eq('email',user.email);else if(m==='registrations')query=query.eq('user_id',user.id);else if(m==='batches')query=query.in('id',await batchIds(user));else if(m==='research')query=query.contains('member_ids',[user.id]);else if(m==='events')query=query.eq('published',true);}const{count,error}=await query;if(error)throw error;counts[m]=count||0;}return NextResponse.json({counts});
 }
 if(module==='profile'){const{data,error}=await client.from('student_profiles').select('*').eq('id',user.id).maybeSingle();if(error)throw error;return NextResponse.json({profile:data,user:{id:user.id,name:user.name,email:user.email,roles:user.roles}})}
 const config=configs[module];if(!config)return fail('Module not found.',404);let query=client.from(config.table).select('*').order('created_at',{ascending:false}).limit(1000);
 if(module==='notifications')query=query.eq('user_id',user.id);
 if(module==='team')query=query.contains('roles',['CORE_TEAM']);
 if(studentScope(user,module)){
 if(module==='applications')query=query.eq('email',user.email);
 else if(module==='registrations')query=query.eq('user_id',user.id);
 else if(['attendance','certificates'].includes(module))query=query.eq('student_id',user.id);
 else if(module==='batches')query=query.in('id',await batchIds(user));
 else if(module==='syllabus')query=query.in('batch_id',await batchIds(user));
 else if(module==='research')query=query.contains('member_ids',[user.id]);
 else if(module==='events')query=query.eq('published',true);
 }
 const{data,error}=await query;if(error)throw error;let rows=data||[];
 if(module==='circulars'){
 const ids=await batchIds(user);const admin=user.roles.some(r=>['SUPER_ADMIN','CONFIG_ADMIN','CLUB_LEAD'].includes(r));rows=rows.filter(r=>admin||((!r.expires_at||r.expires_at>=new Date().toISOString().slice(0,10))&&(r.audience==='General'||(r.audience==='Batch'&&ids.includes(r.batch_id))||(r.audience==='Faculty'&&user.roles.includes('FACULTY'))||(r.audience==='Core Team'&&user.roles.includes('CORE_TEAM')))));
 }
 if(module==='applications'&&studentScope(user,module))rows=rows.map(({notes,...r})=>{void notes;return r});
 return NextResponse.json({rows});
 }catch{return fail('The database tables are not ready or could not be read. Please contact the club administrator.',503)}}
export async function POST(request:Request,{params}:{params:Promise<{module:string}>}){if(!sameOrigin(request))return fail('Invalid request origin.',403);const user=await getMember();if(!user)return fail('Please sign in again.',401);const{module}=await params;try{const body=await request.json();const action=body.action||'create';if(!['create','edit','delete','assign'].includes(action))return fail('Unsupported action.');if(!can(user,module,module==='profile'?'edit':action))return fail('You do not have permission for this action.',403);const client=db();
 if(module==='batches'&&action==='assign'){const input=z.object({id:z.string().uuid(),students:z.array(z.string().uuid()).min(1).max(1000)}).parse(body);const{data,error}=await client.rpc('assign_batch',{p_batch:input.id,p_students:input.students,p_actor:user.id});if(error)return fail(error.message);return NextResponse.json({added:data})}
 if(module==='profile'){
 const input=z.object({name:z.string().min(1).max(200),enrollment:z.string().min(1).max(100),department:z.string().min(1).max(200),year:z.string().min(1).max(50),phone:z.string().max(30),institute:z.string().max(200),division:z.string().max(50),semester:z.string().max(50),skills:z.string().max(2000),interests:z.string().max(2000),github:z.string().max(500),linkedin:z.string().max(500),portfolio:z.string().max(500)}).parse(body.data);const{name,enrollment,department,year,...details}=input;const{data:old}=await client.from('student_profiles').select('id').eq('id',user.id).maybeSingle();const{error}=await client.rpc('mutate_record',{p_table:'student_profiles',p_action:old?'edit':'create',p_id:user.id,p_data:{id:user.id,name,enrollment,department,year,email:user.email,details},p_actor:user.id});if(error)return fail(error.code==='23505'?'This enrollment number is already registered.':error.message);return NextResponse.json({ok:true});
 }
 const config=configs[module];if(!config||config.readOnly)return fail('This module is read-only.',403);if(module==='applications'&&action!=='edit')return fail('Applications must be submitted using the application form.');const id=body.id?z.string().uuid().parse(body.id):null;if(['edit','delete'].includes(action)&&!id)return fail('A record ID is required.');
 const values:Record<string,unknown>={};if(action!=='delete')for(const field of config.fields){let value=body.data?.[field.key];if(value===undefined||value===''){if(field.required)return fail(`${field.label} is required.`);if(field.type==='number'||field.type==='date'||field.type==='datetime-local'||field.key.endsWith('_id')){values[field.key]=null;continue;}value='';}
 if(typeof value!=='string'&&typeof value!=='number'&&typeof value!=='boolean')return fail(`Invalid ${field.label}.`);if(String(value).length>10000)return fail(`${field.label} is too long.`);if(field.options&&!field.options.includes(String(value)))return fail(`Invalid ${field.label}.`);
 if(field.type==='number')value=z.coerce.number().finite().nonnegative().parse(value);
 if(field.type==='email')value=z.string().email().parse(String(value).toLowerCase().trim());
 if(field.type==='url'&&value){value=z.string().url().parse(value);if(!/^https?:\/\//i.test(String(value)))return fail('Links must use HTTP or HTTPS.');}
 if(field.key.endsWith('_id')&&value)value=z.string().uuid().parse(value);
 if(field.type==='datetime-local'&&value)value=new Date(String(value)).toISOString();
 if(['published','team','disabled','confidential','pinned'].includes(field.key))value=String(value)==='true';
 if(field.key==='round')value=Number(value);
 if(field.key==='roles')value=z.array(z.enum(ROLES)).min(1).parse(String(value).split(',').map(s=>s.trim()));
 if(field.key==='permissions')value=value?z.record(z.string(),z.array(z.enum(['view','create','edit','delete','approve','export','assign']))).parse(JSON.parse(String(value))):{};
 if(field.key==='member_ids')value=String(value).trim()?z.array(z.string().uuid()).parse(String(value).split(',').map(s=>s.trim())):[];
 values[field.key]=value;
 }
 if(module==='users'){
 if(id===user.id)return fail('You cannot modify your own administrative access.');
 if(action!=='delete'&&(values.roles as string[]).includes('STUDENT')&&!universityEmail(String(values.email)))return fail('Students must use @paruluniversity.ac.in.');
 if(!user.roles.includes('SUPER_ADMIN')){if((values.roles as string[]|undefined)?.some(r=>['SUPER_ADMIN','CONFIG_ADMIN'].includes(r)))return fail('Only a Super Admin can assign administrator roles.',403);if(id){const{data:target}=await client.from('users').select('roles').eq('id',id).single();if(target?.roles.some((r:string)=>['SUPER_ADMIN','CONFIG_ADMIN'].includes(r)))return fail('Only a Super Admin can modify administrators.',403);}}
 }
 if(module==='team'){if(action!=='edit'||!id)return fail('Only permissions of existing core members can be edited here.');const{data:target}=await client.from('users').select('roles').eq('id',id).single();if(!target?.roles.includes('CORE_TEAM')||target.roles.some((r:string)=>['SUPER_ADMIN','CONFIG_ADMIN','CLUB_LEAD'].includes(r)))return fail('This account cannot be managed through core team access.',403);const assigned=values.permissions as Record<string,string[]>;if(Object.keys(assigned).some(m=>['users','configuration','team','audit'].includes(m)))return fail('Core team grants cannot include administrator or permission-management modules.',403);}
 if(module==='attendance')values.marked_by=user.id;
 if(module==='applications'&&values.status){const{data:current}=await client.from('applications').select('status').eq('id',id).single();const transitions:Record<string,string[]>={'Submitted':['Under Review','Rejected'],'Under Review':['Round 1 Shortlisted','Rejected'],'Round 1 Shortlisted':['Round 1 Rejected','Round 2 Shortlisted'],'Round 1 Rejected':['Rejected'],'Round 2 Shortlisted':['Selected','Waitlisted','Rejected'],'Waitlisted':['Selected','Rejected'],'Selected':[],'Rejected':[]};if(current&&values.status!==current.status&&!transitions[current.status]?.includes(String(values.status)))return fail('Move the application through review and both interview rounds in order.');if(['Round 2 Shortlisted','Selected'].includes(String(values.status))){const round=values.status==='Selected'?2:1;const{data:interview}=await client.from('interviews').select('id').eq('application_id',id).eq('round',round).eq('status','Completed').not('score','is',null).maybeSingle();if(!interview)return fail(`Complete and score round ${round} before advancing this candidate.`);}}
 if(module==='interviews'&&action!=='delete'){const{data:app}=await client.from('applications').select('status').eq('id',values.application_id).single();const expected=values.round===2?'Round 2 Shortlisted':'Round 1 Shortlisted';if(app?.status!==expected)return fail(`The application must be ${expected} before scheduling or editing this round.`);}
 const{data,error}=await client.rpc('mutate_record',{p_table:config.table,p_action:action,p_id:id,p_data:values,p_actor:user.id});if(error)return fail(error.code==='23505'?'A record with these details already exists.':error.message);return NextResponse.json({record:data});
 }catch(e){return fail(e instanceof z.ZodError?e.issues.map(i=>i.message).join(' '):'The record could not be saved. Check the field values and try again.')}}

-- Additive upgrade: preserves existing applications, users, batches and attendance.
begin;
alter table public.batches add column if not exists program text not null default 'Incubation 1';
alter table public.batches add column if not exists academic_year integer check (academic_year between 1 and 6);
alter table public.batches add column if not exists core_member_ids uuid[] not null default '{}';
alter table public.batches add column if not exists faculty_member_ids uuid[] not null default '{}';
alter table public.applications add column if not exists program text not null default 'Incubation 1';
alter table public.applications add column if not exists recommendation text check(recommendation in ('Recommended','Not Recommended','Hold'));
alter table public.applications add column if not exists reviewed_by uuid references public.users(id);
alter table public.applications add column if not exists finalized_by uuid references public.users(id);
alter table public.applications add column if not exists batch_id uuid references public.batches(id);
alter table public.attendance add column if not exists batch_id uuid references public.batches(id);
create table if not exists public.intake_limits(program text not null, academic_year integer not null check(academic_year between 1 and 6), capacity integer not null check(capacity between 1 and 10000), primary key(program,academic_year));
alter table public.intake_limits enable row level security;
revoke all on public.intake_limits from public,anon,authenticated;
grant all on public.intake_limits to service_role;
create table if not exists public.club_tasks(id uuid primary key default gen_random_uuid(),title text not null,description text not null default '',assignee_id uuid not null references public.users(id),module text not null default 'events',event_id uuid references public.events(id),deadline date,status text not null default 'To do' check(status in ('To do','In progress','Done')),created_at timestamptz not null default now());
create table if not exists public.faculty_feedback(id uuid primary key default gen_random_uuid(),student_id uuid not null references public.users(id),author_id uuid not null references public.users(id),title text not null,remarks text not null,decision text not null default 'Feedback' check(decision in ('Feedback','Approved','Changes requested')),created_at timestamptz not null default now());
alter table public.club_tasks enable row level security;
alter table public.faculty_feedback enable row level security;
revoke all on public.club_tasks,public.faculty_feedback from public,anon,authenticated;
grant all on public.club_tasks,public.faculty_feedback to service_role;

-- All admissions and capacity writes share a transaction lock. A failed operation
-- rolls back the decision, membership, profile, notification and audit together.
create or replace function public.club_operation(p_actor uuid,p_action text,p_data jsonb)
returns jsonb language plpgsql set search_path=public as $$
declare actor public.users; applicant public.applications; batch public.batches; student public.users;
 result jsonb; record_id uuid; year_no integer; limit_no integer; occupied integer; roster jsonb; item jsonb; staff uuid[]; faculty uuid[];
begin
 select * into actor from public.users where id=p_actor and not disabled;
 if not found then raise exception 'Account is unavailable.'; end if;
 if not (actor.roles && array['SUPER_ADMIN','CONFIG_ADMIN']) then
   if p_action='progress' and 'STUDENT'=any(actor.roles) then null;
   elsif p_action='feedback' and 'FACULTY'=any(actor.roles) then null;
   elsif p_action='task_status' and actor.roles && array['CORE_TEAM','CLUB_LEAD'] then null;
   elsif p_action='review' and actor.roles && array['CORE_TEAM','CLUB_LEAD'] and coalesce(actor.permissions->'applications','[]') ? 'edit' and coalesce(actor.permissions->'interviews','[]') ? 'edit' then null;
   elsif p_action='attendance' and actor.roles && array['CORE_TEAM','CLUB_LEAD'] and coalesce(actor.permissions->'attendance','[]') ? 'edit' then null;
   else raise exception 'You do not have permission for this action.'; end if;
 end if;
 perform pg_advisory_xact_lock(71902603);
 if p_action='progress' then
   if not exists(select 1 from public.syllabus s join public.batch_members bm on bm.batch_id=s.batch_id where s.id=(p_data->>'id')::uuid and bm.student_id=actor.id) then raise exception 'This lesson is not assigned to you.'; end if;
   insert into public.learning_progress(student_id,syllabus_id,completed) values(actor.id,(p_data->>'id')::uuid,(p_data->>'completed')::boolean) on conflict(student_id,syllabus_id) do update set completed=excluded.completed returning to_jsonb(learning_progress.*) into result;
 elsif p_action='feedback' then
   if p_data->>'decision'<>'Feedback' and not(actor.roles && array['SUPER_ADMIN','CONFIG_ADMIN']) and not(coalesce(actor.permissions->'feedback','[]') ? 'approve') then raise exception 'Activity approval permission is required.'; end if;
   if not exists(select 1 from public.student_profiles where id=(p_data->>'student')::uuid) then raise exception 'Student not found.'; end if;
   insert into public.faculty_feedback(student_id,author_id,title,remarks,decision) values((p_data->>'student')::uuid,actor.id,p_data->>'title',p_data->>'remarks',p_data->>'decision') returning to_jsonb(faculty_feedback.*) into result;
 elsif p_action='task_status' then
   update public.club_tasks set status=p_data->>'status' where id=(p_data->>'id')::uuid and (assignee_id=actor.id or actor.roles && array['SUPER_ADMIN','CONFIG_ADMIN']) returning to_jsonb(club_tasks.*) into result;
   if result is null then raise exception 'Task not found or not assigned to you.'; end if;
 elsif p_action='task' then
   if not exists(select 1 from public.users where id=(p_data->>'assignee')::uuid and not disabled and roles && array['CORE_TEAM','CLUB_LEAD']) then raise exception 'Choose an active Core Team member.'; end if;
   insert into public.club_tasks(title,description,assignee_id,module,event_id,deadline) values(p_data->>'title',coalesce(p_data->>'description',''),(p_data->>'assignee')::uuid,p_data->>'module',nullif(p_data->>'event','')::uuid,nullif(p_data->>'deadline','')::date) returning to_jsonb(club_tasks.*) into result;
 elsif p_action='limit' then
   year_no:=(p_data->>'year')::integer; limit_no:=(p_data->>'capacity')::integer;
   select count(distinct bm.student_id) into occupied from public.batch_members bm join public.batches b on b.id=bm.batch_id where b.program='Incubation 1' and b.academic_year=year_no;
   if limit_no<occupied then raise exception 'The year limit cannot be lower than its current enrollment.'; end if;
   insert into public.intake_limits values('Incubation 1',year_no,limit_no) on conflict(program,academic_year) do update set capacity=excluded.capacity;
   result:=p_data;
 elsif p_action='batch' then
   year_no:=(p_data->>'year')::integer;
   if not exists(select 1 from public.intake_limits where program='Incubation 1' and academic_year=year_no) then raise exception 'Set the year intake limit before creating a batch.'; end if;
   staff:=array(select jsonb_array_elements_text(coalesce(p_data->'core','[]'))::uuid);
   faculty:=array(select jsonb_array_elements_text(coalesce(p_data->'faculty','[]'))::uuid);
   if exists(select 1 from unnest(staff) s left join public.users u on u.id=s where u.id is null or u.disabled or not(u.roles && array['CORE_TEAM','CLUB_LEAD'])) then raise exception 'Choose active Core Team members.'; end if;
   if exists(select 1 from unnest(faculty) s left join public.users u on u.id=s where u.id is null or u.disabled or not('FACULTY'=any(u.roles))) then raise exception 'Choose active faculty members.'; end if;
   if nullif(p_data->>'id','') is null then
     insert into public.batches(title,code,capacity,academic_year,core_member_ids,faculty_member_ids,schedule,room,status)
     values(p_data->>'title',p_data->>'code',(p_data->>'capacity')::integer,year_no,staff,faculty,coalesce(p_data->>'schedule',''),coalesce(p_data->>'room',''),'Active') returning to_jsonb(batches.*) into result;
   else
     select * into batch from public.batches where id=(p_data->>'id')::uuid for update;
     if not found then raise exception 'Batch not found.'; end if;
     select count(*) into occupied from public.batch_members where batch_id=batch.id;
     if occupied>(p_data->>'capacity')::integer then raise exception 'Capacity cannot be lower than the current roster.'; end if;
     if occupied>0 and batch.academic_year is distinct from year_no then raise exception 'An occupied batch cannot change academic year.'; end if;
     update public.batches set title=p_data->>'title',code=p_data->>'code',capacity=(p_data->>'capacity')::integer,academic_year=year_no,core_member_ids=staff,faculty_member_ids=faculty,schedule=coalesce(p_data->>'schedule',''),room=coalesce(p_data->>'room','') where id=batch.id returning to_jsonb(batches.*) into result;
   end if;
 elsif p_action='review' then
   select * into applicant from public.applications where id=(p_data->>'id')::uuid for update;
   if not found then raise exception 'Application not found.'; end if;
   if applicant.finalized_by is not null or applicant.status in ('Selected','Rejected') then raise exception 'This application has already been finalized.'; end if;
   if coalesce(p_data->>'recommendation','') not in ('Recommended','Not Recommended','Hold') or (p_data->>'score') is null or (p_data->>'score')::numeric not between 0 and 100 or length(trim(coalesce(p_data->>'notes','')))=0 then raise exception 'Add a recommendation, score and interview notes.'; end if;
   insert into public.interviews(application_id,round,slot,room,panel,score,notes,status) values(applicant.id,1,now(),coalesce(p_data->>'room',''),actor.name,(p_data->>'score')::numeric,p_data->>'notes','Completed')
   on conflict(application_id,round) do update set panel=excluded.panel,score=excluded.score,notes=excluded.notes,status='Completed';
   update public.applications set recommendation=p_data->>'recommendation',reviewed_by=actor.id,status=case when p_data->>'recommendation'='Recommended' then 'Round 2 Shortlisted' else 'Under Review' end where id=applicant.id returning to_jsonb(applications.*) into result;
 elsif p_action='finalize' then
   select * into applicant from public.applications where id=(p_data->>'id')::uuid for update;
   if not found then raise exception 'Application not found.'; end if;
   if applicant.status in ('Selected','Rejected') then raise exception 'This application has already been finalized.'; end if;
   if applicant.reviewed_by is null then raise exception 'Core Team must complete the first interview before an administrator decides.'; end if;
   if coalesce(p_data->>'decision','') not in ('Selected','Waitlisted','Rejected') then raise exception 'Choose a final decision.'; end if;
   if p_data->>'decision'='Selected' then
     if applicant.recommendation is distinct from 'Recommended' then raise exception 'Selection requires a positive Core Team recommendation.'; end if;
     select * into batch from public.batches where id=(p_data->>'batch')::uuid for update;
     if not found or batch.status<>'Active' then raise exception 'Choose an active batch.'; end if;
     year_no:=(applicant.details->>'year')::integer;
     if batch.program<>applicant.program or batch.academic_year is distinct from year_no then raise exception 'The batch must match the application program and academic year.'; end if;
     select capacity into limit_no from public.intake_limits where program=batch.program and academic_year=year_no;
     if not found then raise exception 'Set the intake limit for this academic year first.'; end if;
     select * into student from public.users where email=applicant.email for update;
     if found and student.disabled then raise exception 'The applicant account is disabled.'; end if;
     if student.id is null then
       insert into public.users(email,name,roles) values(applicant.email,applicant.name,array['STUDENT']) returning * into student;
     elsif not('STUDENT'=any(student.roles)) then
       update public.users set roles=array_append(roles,'STUDENT') where id=student.id returning * into student;
     end if;
     if exists(select 1 from public.batch_members bm join public.batches b on b.id=bm.batch_id where bm.student_id=student.id and b.program=batch.program) then raise exception 'This student already belongs to a batch in this program.'; end if;
     select count(*) into occupied from public.batch_members where batch_id=batch.id;
     if occupied>=batch.capacity then raise exception 'This batch is full.'; end if;
     select count(distinct bm.student_id) into occupied from public.batch_members bm join public.batches b on b.id=bm.batch_id where b.program=batch.program and b.academic_year=year_no;
     if occupied>=limit_no then raise exception 'The year intake limit has been reached.'; end if;
     insert into public.student_profiles(id,name,enrollment,email,department,year,details) values(student.id,applicant.name,applicant.enrollment,applicant.email,coalesce(applicant.details->>'department',''),year_no::text,applicant.details) on conflict(id) do nothing;
     insert into public.batch_members(batch_id,student_id) values(batch.id,student.id);
     insert into public.notifications(user_id,title,message) values(student.id,'Your Incubation 1 placement', 'You have been selected for '||batch.title||'. Check your batch schedule in the portal.');
   end if;
   update public.applications set status=p_data->>'decision',finalized_by=actor.id,batch_id=case when p_data->>'decision'='Selected' then batch.id else null end,notes=coalesce(p_data->>'notes','') where id=applicant.id returning to_jsonb(applications.*) into result;
 elsif p_action='attendance' then
   select * into batch from public.batches where id=(p_data->>'batch')::uuid for update;
   if not found then raise exception 'Batch not found.'; end if;
   if not(actor.roles && array['SUPER_ADMIN','CONFIG_ADMIN']) and not(actor.id=any(batch.core_member_ids)) then raise exception 'You can mark attendance only for your assigned batches.'; end if;
   roster:=p_data->'records';
   if jsonb_typeof(roster) is distinct from 'array' or jsonb_array_length(roster)=0 or length(trim(coalesce(p_data->>'session','')))=0 or (p_data->>'date') is null or (p_data->>'date')::date>current_date then raise exception 'Choose a session, valid date and complete roster.'; end if;
   if jsonb_array_length(roster)<>(select count(*) from public.batch_members where batch_id=batch.id) or jsonb_array_length(roster)<>(select count(distinct r->>'student_id') from jsonb_array_elements(roster) r) then raise exception 'Mark each student in the current roster exactly once.'; end if;
   for item in select * from jsonb_array_elements(roster) loop
     if coalesce(item->>'status','') not in ('Present','Absent') or not exists(select 1 from public.batch_members where batch_id=batch.id and student_id=(item->>'student_id')::uuid) then raise exception 'Invalid attendance record.'; end if;
     insert into public.attendance(student_id,batch_id,session,date,status,marked_by) values((item->>'student_id')::uuid,batch.id,batch.code||' · '||(p_data->>'session'),(p_data->>'date')::date,item->>'status',actor.id)
     on conflict(student_id,session,date) do update set status=excluded.status,marked_by=excluded.marked_by,batch_id=excluded.batch_id;
   end loop;
   result:=jsonb_build_object('count',jsonb_array_length(roster));
 else raise exception 'Unsupported operation.';
 end if;
 insert into public.audit_logs(actor_id,action,module,record_id,current) values(actor.id,p_action,'club_workflow',coalesce(result->>'id',p_data->>'batch'),jsonb_build_object('input',p_data,'result',result));
 return result;
end $$;
revoke all on function public.club_operation(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.club_operation(uuid,text,jsonb) to service_role;
commit;

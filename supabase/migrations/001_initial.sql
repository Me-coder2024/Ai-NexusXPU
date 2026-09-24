-- AI Nexus / Supabase PostgreSQL. Run once in the project's SQL editor.
-- The app verifies Firebase identity on the server. No browser receives the secret key.
begin;
create extension if not exists pgcrypto;
create table public.users (id uuid primary key default gen_random_uuid(), firebase_uid text unique, email text unique not null check(email=lower(email)), name text not null, roles text[] not null default '{STUDENT}' check(roles <@ array['SUPER_ADMIN','CONFIG_ADMIN','CLUB_LEAD','CORE_TEAM','FACULTY','STUDENT']::text[] and cardinality(roles)>0), permissions jsonb not null default '{}', disabled boolean not null default false, created_at timestamptz not null default now(), check(not ('STUDENT'=any(roles)) or email ~ '^[^@[:space:]]+@paruluniversity\.ac\.in$'));
create table public.student_profiles (id uuid primary key references public.users(id) on delete cascade, name text not null, enrollment text not null unique, email text not null unique, department text not null, year text not null, details jsonb not null default '{}', created_at timestamptz not null default now());
create table public.applications (id uuid primary key default gen_random_uuid(), name text not null, enrollment text unique not null, email text unique not null check(email ~ '^[^@[:space:]]+@paruluniversity\.ac\.in$'), status text not null default 'Submitted' check(status in ('Submitted','Under Review','Round 1 Shortlisted','Round 1 Rejected','Round 2 Shortlisted','Selected','Waitlisted','Rejected')), details jsonb not null default '{}', notes text default '', created_at timestamptz not null default now());
create table public.interviews (id uuid primary key default gen_random_uuid(), application_id uuid not null references public.applications(id), round int not null check(round in (1,2)), slot timestamptz not null, room text not null, panel text default '', score numeric check(score between 0 and 100), notes text default '', status text not null default 'Scheduled' check(status in ('Scheduled','Present','Absent','Completed')), created_at timestamptz not null default now(), unique(application_id,round));
create table public.batches (id uuid primary key default gen_random_uuid(), title text not null, code text unique not null, capacity int not null default 30 check(capacity between 1 and 1000), mentor text default '', faculty_mentor text default '', room text default '', schedule text default '', start_date date, end_date date, status text default 'Draft', description text default '', created_at timestamptz not null default now(), check(end_date is null or start_date is null or end_date>=start_date));
create table public.batch_members (id uuid primary key default gen_random_uuid(), batch_id uuid not null references public.batches(id) on delete cascade, student_id uuid not null references public.users(id), created_at timestamptz not null default now(), unique(batch_id,student_id));
create table public.syllabus (id uuid primary key default gen_random_uuid(), title text not null, batch_id uuid not null references public.batches(id) on delete cascade, track text default '', module_number int default 1, topics text default '', session text default '', resource_url text default '', assignment text default '', instructor text default '', expected_date date, status text default 'Draft', created_at timestamptz not null default now());
create table public.learning_progress (id uuid primary key default gen_random_uuid(), student_id uuid not null references public.users(id), syllabus_id uuid not null references public.syllabus(id) on delete cascade, completed boolean not null default false, created_at timestamptz not null default now(), unique(student_id,syllabus_id));
create table public.circulars (id uuid primary key default gen_random_uuid(), title text not null, number text unique not null, content text not null, audience text not null default 'General' check(audience in ('General','Batch','Faculty','Core Team')), batch_id uuid references public.batches(id), priority text default 'Normal', attachment_url text default '', expires_at date, pinned boolean default false, created_at timestamptz not null default now(), check(audience <> 'Batch' or batch_id is not null));
create table public.events (id uuid primary key default gen_random_uuid(), title text not null, type text not null default 'Workshop', description text default '', starts_at timestamptz not null, ends_at timestamptz not null, venue text not null, capacity int not null check(capacity between 1 and 10000), registration_opens timestamptz not null, registration_closes timestamptz not null, team boolean default false, team_size int default 1 check(team_size between 1 and 20), rules text default '', coordinator text default '', contact text default '', status text not null default 'Closed' check(status in ('Open','Closed')), published boolean not null default false, created_at timestamptz not null default now(), check(ends_at>starts_at), check(registration_closes>registration_opens));
create table public.registrations (id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id), user_id uuid not null references public.users(id), name text not null, enrollment text not null, email text not null, phone text not null, institute text not null, department text not null, division text not null, team_name text default '', team_members text default '', participant_count int not null default 1, status text not null default 'Confirmed' check(status in ('Confirmed','Waitlisted','Cancelled')), created_at timestamptz not null default now(), unique(event_id,enrollment),unique(event_id,user_id));
create table public.attendance (id uuid primary key default gen_random_uuid(), student_id uuid not null references public.users(id), session text not null, date date not null, status text not null check(status in ('Present','Absent')), marked_by uuid references public.users(id), created_at timestamptz not null default now(), unique(student_id,session,date));
create table public.research (id uuid primary key default gen_random_uuid(), title text not null, area text default '', problem text default '', faculty_mentor text default '', external_mentor text default '', member_ids uuid[] default '{}', literature_status text default '', dataset text default '', model text default '', experiments text default '', metrics text default '', paper_status text default '', publication text default '', milestones text default '', status text default 'Draft', created_at timestamptz not null default now());
create table public.industry (id uuid primary key default gen_random_uuid(), title text not null, partner text default '', problem text default '', confidential boolean default true, owner text default '', member_ids uuid[] default '{}', stack text default '', milestones text default '', prototype_status text default '', deployment_status text default '', status text default 'Draft', created_at timestamptz not null default now());
create table public.esports (id uuid primary key default gen_random_uuid(), title text not null, game text default 'BGMI', team_name text default '', players text default '', "group" text default '', room text default '', match_time timestamptz, kill_points int default 0 check(kill_points>=0), placement_points int default 0 check(placement_points>=0), rank int check(rank>0), status text default 'Draft', created_at timestamptz not null default now());
create table public.certificates (id uuid primary key default gen_random_uuid(), title text not null, student_id uuid not null references public.users(id), url text not null, created_at timestamptz not null default now());
create table public.notifications (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id), title text not null, message text not null, read boolean not null default false, created_at timestamptz not null default now());
create table public.configuration (id uuid primary key default gen_random_uuid(), title text unique not null, category text not null, value text not null, created_at timestamptz not null default now());
create table public.audit_logs (id uuid primary key default gen_random_uuid(), actor_id uuid references public.users(id), action text not null, module text not null, record_id text, previous jsonb, current jsonb, created_at timestamptz not null default now());
create index on public.applications(status);
create index on public.batch_members(student_id);
create index on public.registrations(event_id,status);
create index on public.attendance(student_id);
create index on public.notifications(user_id);

-- Deny direct anonymous/authenticated Data API access. All operations go through
-- Firebase-verified, role-authorized Next.js handlers with a server-only secret.
do $$ declare t text; begin foreach t in array array['users','student_profiles','applications','interviews','batches','batch_members','syllabus','learning_progress','circulars','events','registrations','attendance','research','industry','esports','certificates','notifications','configuration','audit_logs'] loop execute format('alter table public.%I enable row level security',t); execute format('revoke all on public.%I from anon, authenticated',t); execute format('grant all on public.%I to service_role',t); end loop; end $$;

create function public.register_for_event(p_event uuid,p_user uuid,p_data jsonb) returns public.registrations language plpgsql set search_path=public as $$
declare e public.events; result public.registrations; occupied integer; seats integer; begin
 select * into e from public.events where id=p_event for update;
 if not found or not e.published or e.status<>'Open' or now()<e.registration_opens or now()>e.registration_closes then raise exception 'Registration is not open for this event.'; end if;
 seats:=case when e.team then e.team_size else 1 end;
 if e.team and (coalesce(p_data->>'teamName','')='' or coalesce(p_data->>'teamMembers','')='') then raise exception 'Team name and member details are required.'; end if;
 select coalesce(sum(participant_count),0) into occupied from public.registrations where event_id=p_event and status='Confirmed';
 insert into public.registrations(event_id,user_id,name,enrollment,email,phone,institute,department,division,team_name,team_members,participant_count,status)
 values(p_event,p_user,p_data->>'name',p_data->>'enrollment',p_data->>'email',p_data->>'phone',p_data->>'institute',p_data->>'department',p_data->>'division',coalesce(p_data->>'teamName',''),coalesce(p_data->>'teamMembers',''),seats,case when occupied+seats<=e.capacity then 'Confirmed' else 'Waitlisted' end) returning * into result;
 insert into public.notifications(user_id,title,message) values(p_user,'Event registration '||lower(result.status),e.title||' · Registration ID: '||result.id);
 return result; end $$;
revoke all on function public.register_for_event(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.register_for_event(uuid,uuid,jsonb) to service_role;

create function public.assign_batch(p_batch uuid,p_students uuid[],p_actor uuid) returns integer language plpgsql set search_path=public as $$
declare b public.batches; occupied integer; additions integer; begin
 select * into b from public.batches where id=p_batch for update;
 if not found then raise exception 'Batch not found.'; end if;
 if exists(select 1 from unnest(p_students) s left join public.users u on u.id=s where u.id is null or not ('STUDENT'=any(u.roles)) or u.disabled) then raise exception 'All members must be enabled student accounts.'; end if;
 select count(*) into occupied from public.batch_members where batch_id=p_batch;
 select count(distinct s) into additions from unnest(p_students) s where not exists(select 1 from public.batch_members where batch_id=p_batch and student_id=s);
 if occupied+additions>b.capacity then raise exception 'Batch capacity exceeded.'; end if;
 insert into public.batch_members(batch_id,student_id) select p_batch,s from unnest(p_students) s on conflict do nothing;
 insert into public.audit_logs(actor_id,action,module,record_id,current) values(p_actor,'assign','batches',p_batch::text,jsonb_build_object('students',p_students));
 return additions; end $$;
revoke all on function public.assign_batch(uuid,uuid[],uuid) from public,anon,authenticated;
grant execute on function public.assign_batch(uuid,uuid[],uuid) to service_role;

-- Every administrative write and its audit entry commit together.
create function public.mutate_record(p_table text,p_action text,p_id uuid,p_data jsonb,p_actor uuid) returns jsonb language plpgsql set search_path=public as $$
declare prev jsonb; result jsonb; cols text; vals text; assignments text; permitted text[]:=array['users','applications','interviews','batches','syllabus','circulars','events','attendance','research','industry','esports','certificates','configuration','student_profiles']; begin
 if not(p_table=any(permitted)) then raise exception 'Unsupported table.'; end if;
 if p_action in ('edit','delete') then execute format('select to_jsonb(t) from public.%I t where id=$1 for update',p_table) into prev using p_id; if prev is null then raise exception 'Record not found.'; end if; end if;
 if p_action='delete' then execute format('delete from public.%I where id=$1',p_table) using p_id; result:=prev;
 elsif p_action in ('create','edit') then
 select string_agg(format('%I',key),','),string_agg(format('(jsonb_populate_record(null::public.%I,$1)).%I',p_table,key),','),string_agg(format('%I=(jsonb_populate_record(null::public.%I,$1)).%I',key,p_table,key),',') into cols,vals,assignments from jsonb_object_keys(p_data) key where key not in ('created_at');
 if p_action='create' then execute format('insert into public.%I(%s) select %s returning to_jsonb(%I.*)',p_table,cols,vals,p_table) into result using p_data;
 else execute format('update public.%I set %s where id=$2 returning to_jsonb(%I.*)',p_table,assignments,p_table) into result using p_data,p_id; end if;
 else raise exception 'Unsupported action.'; end if;
 insert into public.audit_logs(actor_id,action,module,record_id,previous,current) values(p_actor,p_action,p_table,result->>'id',prev,result);
 return result; end $$;
revoke all on function public.mutate_record(text,text,uuid,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.mutate_record(text,text,uuid,jsonb,uuid) to service_role;
commit;

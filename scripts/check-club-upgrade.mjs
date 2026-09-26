import {createClient} from '@supabase/supabase-js';
const db=createClient(process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY);
for(const [table,columns] of [['applications','id,program,recommendation'],['batches','id,academic_year,core_member_ids'],['club_tasks','id'],['faculty_feedback','id'],['intake_limits','program']]){const {count,error}=await db.from(table).select(columns,{count:'exact',head:true});console.log(table,error?error.code:`ready (${count} records)`)}

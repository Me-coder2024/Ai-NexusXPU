import 'server-only';
import {createClient} from '@supabase/supabase-js';
function databaseUrl(){return process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL}
function databaseKey(){return process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY}
export function databaseConfigured(){return Boolean(databaseUrl()&&databaseKey())}
export function db(){if(!databaseConfigured())throw new Error('The club database is not connected yet. Please try again once setup is complete.');return createClient(databaseUrl()!.trim(),databaseKey()!.trim(),{auth:{persistSession:false,autoRefreshToken:false}})}

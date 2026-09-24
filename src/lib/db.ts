import 'server-only';
import {createClient} from '@supabase/supabase-js';
export function databaseConfigured(){return Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_SECRET_KEY)}
export function db(){if(!databaseConfigured())throw new Error('The club database is not connected yet. Please try again once setup is complete.');return createClient(process.env.SUPABASE_URL!,process.env.SUPABASE_SECRET_KEY!,{auth:{persistSession:false,autoRefreshToken:false}})}

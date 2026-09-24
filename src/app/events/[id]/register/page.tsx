import {notFound,redirect} from 'next/navigation';
import {getMember} from '@/lib/auth';
import {db} from '@/lib/db';
import {PageShell} from '@/components/page-shell';
import {RegistrationForm} from '@/components/registration-form';
export default async function Register({params}:{params:Promise<{id:string}>}){const user=await getMember();if(!user)redirect('/login');const{id}=await params;const{data:event}=await db().from('events').select('*').eq('id',id).eq('published',true).maybeSingle();if(!event)notFound();const{data:profile}=await db().from('student_profiles').select('*').eq('id',user.id).maybeSingle();return <PageShell><span className="eyebrow">SAVE YOUR SPOT</span><h1 className="page-title">{event.title}</h1><p className="page-description">Check your details and join the experience.</p><RegistrationForm eventId={id} team={event.team} profile={{...profile,...profile?.details,name:profile?.name||user.name,email:user.email}}/></PageShell>}

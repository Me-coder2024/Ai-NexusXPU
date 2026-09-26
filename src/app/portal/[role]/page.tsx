import {redirect,notFound} from 'next/navigation';
import {getMember} from '@/lib/auth';
import {can,modules,portalRole} from '@/lib/permissions';
import {Portal} from '@/components/portal';
export const dynamic='force-dynamic';
export default async function RolePortal({params,searchParams}:{params:Promise<{role:string}>;searchParams:Promise<{module?:string}>}){
 const {role}=await params;if(!['admin','core-team','faculty','student'].includes(role))notFound();
 const member=await getMember();if(!member)redirect('/login');
 const actual=portalRole(member);if(role!==actual)redirect(`/portal/${actual}`);
 const {module}=await searchParams;const selected=module&&modules.includes(module as typeof modules[number])&&can(member,module)?module:'overview';
 return <Portal member={member} initialModule={selected}/>;
}

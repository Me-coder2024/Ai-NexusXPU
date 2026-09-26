import {redirect} from 'next/navigation';
import {getMember} from '@/lib/auth';
import {portalRole} from '@/lib/permissions';
export const dynamic='force-dynamic';
export default async function PortalPage({searchParams}:{searchParams:Promise<{module?:string}>}){const member=await getMember();if(!member)redirect('/login');const {module}=await searchParams;redirect(`/portal/${portalRole(member)}${module?'?module='+encodeURIComponent(module):''}`)}

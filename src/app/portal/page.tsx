import {redirect} from 'next/navigation';
import {getMember} from '@/lib/auth';
import {can,modules} from '@/lib/permissions';
import {Portal} from '@/components/portal';
export const dynamic='force-dynamic';
export default async function PortalPage({searchParams}:{searchParams:Promise<{module?:string}>}){const member=await getMember();if(!member)redirect('/login');const{module}=await searchParams;const selected=module&&modules.includes(module as typeof modules[number])&&can(member,module)?module:'overview';return <Portal member={member} initialModule={selected}/>}

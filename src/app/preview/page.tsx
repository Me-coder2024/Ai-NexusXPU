import {Portal} from '@/components/portal';
import {type Member,type Role} from '@/lib/permissions';
export default async function Preview({searchParams}:{searchParams:Promise<{role?:string;module?:string}>}){
 const {role,module}=await searchParams;const roles:Record<string,Role>={admin:'SUPER_ADMIN','core-team':'CORE_TEAM',faculty:'FACULTY',student:'STUDENT'};
 const member:Member={id:'preview',name:'Nexus Explorer',email:'explorer@paruluniversity.ac.in',roles:[roles[role||'student']||'STUDENT'],disabled:false,permissions:{applications:['view','edit'],interviews:['view','edit'],batches:['view'],attendance:['view','edit'],events:['view','edit'],research:['view'],industry:['view'],esports:['view']}};
 return <Portal preview member={member} initialModule={module||'overview'}/>;
}

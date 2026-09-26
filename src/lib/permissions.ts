export const ROLES=['SUPER_ADMIN','CONFIG_ADMIN','CLUB_LEAD','CORE_TEAM','FACULTY','STUDENT'] as const;
export type Role=typeof ROLES[number];
export type Member={id:string;email:string;name:string;roles:Role[];permissions:Record<string,string[]>;disabled:boolean};
export const modules=['overview','profile','tasks','applications','interviews','students','team','batches','syllabus','progress','feedback','circulars','events','registrations','attendance','research','industry','esports','certificates','analytics','notifications','users','configuration','audit'] as const;
export type Module=typeof modules[number];
export function universityEmail(email:string){return /^[^@\s]+@paruluniversity\.ac\.in$/i.test(email)}
export function can(member:Member,module:string,action='view'){
 if(member.disabled)return false;
 if(member.roles.length&&action==='view'&&['overview','profile','notifications'].includes(module))return true;
 if(member.roles.some(r=>r==='SUPER_ADMIN'||r==='CONFIG_ADMIN'))return true;
 if(['users','team','configuration','audit'].includes(module))return false;
 if(['applications','interviews','batches','attendance'].includes(module)&&['delete','assign','approve'].includes(action))return false;
 if(member.roles.some(r=>r==='CORE_TEAM'||r==='CLUB_LEAD')){
   if(action==='view'&&['tasks','circulars'].includes(module))return true;
   if(module==='tasks'&&action==='edit')return true;
   if(member.permissions[module]?.includes(action)&&!(['events','research','industry','syllabus','applications','interviews','attendance'].includes(module)&&action==='create')&&!['progress','feedback'].includes(module))return true;
 }
 if(member.roles.includes('FACULTY')&&action==='view'&&['students','batches','syllabus','progress','feedback','circulars','events','registrations','attendance','research','industry','analytics'].includes(module))return true;
 if(member.roles.includes('FACULTY')&&module==='feedback'&&['create','export'].includes(action))return true;
 if(member.roles.includes('FACULTY')&&action==='export'&&['students','batches','syllabus','progress','attendance','research','registrations'].includes(module))return true;
 if(member.roles.includes('FACULTY')&&module==='feedback'&&action==='approve'&&member.permissions.feedback?.includes('approve'))return true;
 return member.roles.includes('STUDENT')&&((action==='view'&&['overview','profile','batches','syllabus','progress','feedback','circulars','events','registrations','attendance','research','certificates','notifications','applications'].includes(module))||(['profile','progress'].includes(module)&&action==='edit'));
}
export function isAdmin(member:Member){return !member.disabled&&member.roles.some(r=>r==='SUPER_ADMIN'||r==='CONFIG_ADMIN')}
export function portalRole(member:Member){return isAdmin(member)?'admin':member.roles.some(r=>r==='CORE_TEAM'||r==='CLUB_LEAD')?'core-team':member.roles.includes('FACULTY')?'faculty':'student'}

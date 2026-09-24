export const ROLES=['SUPER_ADMIN','CONFIG_ADMIN','CLUB_LEAD','CORE_TEAM','FACULTY','STUDENT'] as const;
export type Role=typeof ROLES[number];
export type Member={id:string;email:string;name:string;roles:Role[];permissions:Record<string,string[]>;disabled:boolean};
export const modules=['overview','profile','applications','interviews','students','team','batches','syllabus','circulars','events','registrations','attendance','research','industry','esports','certificates','analytics','notifications','users','configuration','audit'] as const;
export type Module=typeof modules[number];
export function universityEmail(email:string){return /^[^@\s]+@paruluniversity\.ac\.in$/i.test(email)}
export function can(member:Member,module:string,action='view'){
 if(member.disabled)return false;
 if(member.roles.length&&action==='view'&&['overview','profile','notifications'].includes(module))return true;
 if(member.roles.some(r=>r==='SUPER_ADMIN'||r==='CONFIG_ADMIN'))return true;
 if(member.roles.includes('CLUB_LEAD')&&!['users','configuration'].includes(module))return true;
 if(member.roles.includes('CORE_TEAM')&&member.permissions[module]?.includes(action))return true;
 if(member.roles.includes('FACULTY')&&action==='view'&&['overview','profile','students','batches','syllabus','circulars','events','attendance','research','industry','analytics','notifications'].includes(module))return true;
 if(member.roles.includes('FACULTY')&&member.permissions[module]?.includes(action))return true;
 return member.roles.includes('STUDENT')&&((action==='view'&&['overview','profile','batches','syllabus','circulars','events','registrations','attendance','research','certificates','notifications','applications'].includes(module))||(module==='profile'&&action==='edit'));
}

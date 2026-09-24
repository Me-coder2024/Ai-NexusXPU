import {z} from 'zod';
export const universityEmailSchema=z.string().trim().toLowerCase().email().regex(/^[^@\s]+@paruluniversity\.ac\.in$/i,'Use your @paruluniversity.ac.in email.');
const text=z.string().trim().min(1).max(200);
const optionalUrl=z.string().trim().refine(value=>{
 if(value==='')return true;
 try{return ['https:','http:'].includes(new URL(value).protocol)}catch{return false}
},'Enter a valid HTTP or HTTPS URL, or leave this field blank.').optional();
export const applicationSchema=z.object({name:text,enrollment:text,email:universityEmailSchema,personalEmail:z.union([z.string().email(),z.literal('')]).optional(),phone:z.string().regex(/^[+\d\s()-]{7,20}$/,'Enter a valid phone number.'),institute:text,department:text,division:text,year:text,semester:text,skillLevel:z.enum(['Beginner','Intermediate','Advanced']),domain:z.enum(['AI/ML','Full Stack','Data','Research','UI/UX','Content/Media','Events','Esports','Industry Relations']),github:optionalUrl,linkedin:optionalUrl,portfolio:optionalUrl,motivation:z.string().trim().min(20,'Tell us a little more (at least 20 characters).').max(3000),experience:z.string().max(3000).optional(),preferredRole:text,slotPreference:z.string().max(200).optional(),consent:z.literal(true)});
export const registrationSchema=z.object({name:text,enrollment:text,email:universityEmailSchema,phone:z.string().regex(/^[+\d\s()-]{7,20}$/),institute:text,department:text,division:text,teamName:z.string().max(100).optional(),teamMembers:z.string().max(4000).optional()});

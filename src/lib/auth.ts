import 'server-only';
import {getApps,initializeApp,cert} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {cookies} from 'next/headers';
import {db} from './db';
import {type Member,universityEmail} from './permissions';
export function firebaseAdmin(){const projectId=process.env.FIREBASE_PROJECT_ID||process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;if(!projectId)throw new Error('Firebase project is not configured.');const serviceAccount=process.env.FIREBASE_CLIENT_EMAIL&&process.env.FIREBASE_PRIVATE_KEY;const app=getApps()[0]||initializeApp({projectId,...(serviceAccount?{credential:cert({projectId,clientEmail:process.env.FIREBASE_CLIENT_EMAIL,privateKey:process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g,'\n')})}:{})});return getAuth(app)}
export async function verifyToken(token:string){const user=await firebaseAdmin().verifyIdToken(token,Boolean(process.env.FIREBASE_CLIENT_EMAIL&&process.env.FIREBASE_PRIVATE_KEY));if(!user.email_verified||!user.email||user.firebase.sign_in_provider!=='google.com')throw new Error('A verified Google account is required.');return user}
export async function getMember():Promise<Member|null>{const token=(await cookies()).get('nexus-session')?.value;if(!token)return null;try{const identity=await verifyToken(token);const{data,error}=await db().from('users').select('*').eq('email',identity.email!.toLowerCase()).single();if(error||!data||data.disabled)return null;const member=data as Member;if(member.roles.includes('STUDENT')&&!universityEmail(member.email))return null;return member;}catch{return null}}
export function sameOrigin(request:Request){const origin=request.headers.get('origin');if(!origin)return false;const normalize=(o:string)=>o.replace('://127.0.0.1','://localhost');return normalize(origin)===normalize(new URL(request.url).origin)}

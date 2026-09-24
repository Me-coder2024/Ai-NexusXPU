'use client';
import {initializeApp,getApps} from 'firebase/app';
import {getAuth,GoogleAuthProvider,signInWithPopup,signOut} from 'firebase/auth';
export async function googleLogin(){
 if(!process.env.NEXT_PUBLIC_FIREBASE_API_KEY)throw new Error('Google sign-in is not configured yet. Please contact the club administrator.');
 const app=getApps()[0]||initializeApp({apiKey:process.env.NEXT_PUBLIC_FIREBASE_API_KEY,authDomain:process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,projectId:process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,appId:process.env.NEXT_PUBLIC_FIREBASE_APP_ID});
 const auth=getAuth(app);const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
 const result=await signInWithPopup(auth,provider);
 try{
  const response=await fetch('/api/auth/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:await result.user.getIdToken()})});
  const text=await response.text();
  let data;
  try{data=text?JSON.parse(text):{};}catch{throw new Error(text||`Sign-in failed (${response.status})`);}
  if(!response.ok)throw new Error(data.error||'Unable to sign in.');
  return data;
 }finally{await signOut(auth);}
}

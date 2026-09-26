'use client';
import {initializeApp,getApps} from 'firebase/app';
import {getAuth,GoogleAuthProvider,signInWithPopup,signOut} from 'firebase/auth';
import {establishSession,endSession} from '@/app/login/actions';
function authClient(){
 const app=getApps()[0]||initializeApp({apiKey:process.env.NEXT_PUBLIC_FIREBASE_API_KEY,authDomain:process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,projectId:process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,appId:process.env.NEXT_PUBLIC_FIREBASE_APP_ID});
 return getAuth(app);
}
export async function googleLogin(){
 if(!process.env.NEXT_PUBLIC_FIREBASE_API_KEY)throw new Error('Google sign-in is not configured yet. Please contact the club administrator.');
 const auth=authClient();const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
 const result=await signInWithPopup(auth,provider);
 try{return await establishSession(await result.user.getIdToken())}catch(error){await signOut(auth);throw error}
}
export async function logout(){await signOut(authClient());await endSession()}
export async function refreshSession(){
 const auth=authClient();await auth.authStateReady();
 if(!auth.currentUser)return false;
 await establishSession(await auth.currentUser.getIdToken(true));return true;
}

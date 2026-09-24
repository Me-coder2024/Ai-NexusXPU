// Uses a uniquely marked test applicant and cleans up only records from that test.
const base=process.argv[2]||'http://localhost:3000';
const marker=crypto.randomUUID();
const email=`test-${marker}@paruluniversity.ac.in`;
const enrollment=`TEST-${marker}`;
const headers={apikey:process.env.SUPABASE_SECRET_KEY};
const rest=process.env.SUPABASE_URL+'/rest/v1/';
const input={name:'AUTOMATED TEST - DELETE',enrollment,email,personalEmail:'',phone:'9999999999',institute:'Test Institute',department:'Test Department',division:'TEST',year:'2',semester:'3',skillLevel:'Beginner',github:'',linkedin:'',portfolio:'',motivation:'Automated verification of optional empty application links.',experience:'',consent:true};
try{
 const response=await fetch(base+'/api/applications',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify(input)});
 const body=await response.text();let data;try{data=JSON.parse(body)}catch{throw new Error(`Submission returned ${response.status} with a non-JSON response.`)}
 if(response.status!==201||!data.id)throw new Error(`Submission failed (${response.status}): ${data.error}`);
 console.log('PASS: Application saved with blank optional links and a candidate ID.');
 const stored=await fetch(rest+'applications?id=eq.'+data.id+'&select=id,enrollment',{headers});
 const rows=await stored.json();if(!stored.ok||rows.length!==1||rows[0].enrollment!==enrollment)throw new Error('Saved record verification failed.');
 console.log('PASS: Application confirmed in Supabase.');
}catch(error){console.error(error.message);process.exitCode=1;}
finally{
 const users=await fetch(rest+'users?email=eq.'+encodeURIComponent(email)+'&select=id',{headers});
 if(users.ok){for(const user of await users.json()){
   for(const resource of ['student_profiles?id=eq.'+user.id,'users?id=eq.'+user.id+'&email=eq.'+encodeURIComponent(email)]){
    const cleanup=await fetch(rest+resource,{method:'DELETE',headers});if(!cleanup.ok)throw new Error('Test user cleanup failed.');
   }
 }}
 const cleanup=await fetch(rest+'applications?enrollment=eq.'+enrollment+'&email=eq.'+encodeURIComponent(email),{method:'DELETE',headers});
 if(!cleanup.ok)throw new Error('Test application cleanup failed.');
 console.log('Temporary test records cleaned up.');
}

'use client';
import {useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,CheckCircle2} from 'lucide-react';

function isUniversityEmail(email:string){return /^[^@\s]+@paruluniversity\.ac\.in$/i.test(email)}
export function ApplicationForm(){
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState('');
  const[receipt,setReceipt]=useState('');
  const[emailError,setEmailError]=useState('');
  const[year,setYear]=useState('1');
  const isFirstYear=year==='1';

  function handleEmailChange(e:React.ChangeEvent<HTMLInputElement>){
    const val=e.target.value.trim();
    if(!val){setEmailError('');return}
    if(!isUniversityEmail(val)){setEmailError('Please use your @paruluniversity.ac.in email address.')}
    else{setEmailError('')}
  }

  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setError('');
    const data=Object.fromEntries(new FormData(e.currentTarget));
    const email=String(data.email||'').trim();
    const personalEmail=String(data.personalEmail||'').trim();
    const selectedYear=String(data.year||'1');
    const firstYear=selectedYear==='1';

    if(!firstYear&&!isUniversityEmail(email)){setError('University email must end with @paruluniversity.ac.in');setBusy(false);return}
    if(firstYear&&!personalEmail){setError('Personal email is required for 1st year students.');setBusy(false);return}
    if(email&&!isUniversityEmail(email)){setError('University email must end with @paruluniversity.ac.in');setBusy(false);return}

    try{
      const response=await fetch('/api/applications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,consent:data.consent==='on'})});
      let result;
      const contentType=response.headers.get('content-type');
      if(contentType&&contentType.includes('application/json')){result=await response.json()}
      else{const text=await response.text();throw new Error(text||`Server error (${response.status})`)}
      if(!response.ok)throw new Error(result.error);
      setReceipt(result.id)
    }catch(e){setError(e instanceof Error?e.message:'Something went wrong. Please try again.')}
    finally{setBusy(false)}
  }

  if(receipt)return <div className="success-message" role="status"><CheckCircle2 size={35}/><h2>You&apos;re one step closer.</h2><p>Your application has been saved. Keep your candidate ID: <strong>{receipt}</strong></p><p>Your student portal is ready! Sign in with the same Google account you used to apply. Some sections will unlock after your interview.</p><Link className="primary-button" href="/login">Sign in to your portal ↗</Link></div>;

  return <form onSubmit={submit}>
    <div className="form-grid">
      <h2 className="form-section-title">01 / A little about you</h2>
      <label className="field">Full name<input name="name" type="text" maxLength={200} required placeholder="Full name"/></label>
      <label className="field">Enrollment number / UG number<input name="enrollment" type="text" maxLength={200} required placeholder="Enrollment number / UG number"/></label>

      <label className="field">Current year
        <select name="year" required value={year} onChange={e=>setYear(e.target.value)}>
          {['1','2','3','4','5','Postgraduate'].map(v=><option key={v}>{v}</option>)}
        </select>
      </label>
      <label className="field">Semester
        <select name="semester" required>
          {Array.from({length:10},(_,i)=><option key={i}>{i+1}</option>)}
        </select>
      </label>

      <label className="field">
        University email{isFirstYear?' (optional — 1st year)':''}
        <input name="email" type="email" maxLength={200} required={!isFirstYear} placeholder="you@paruluniversity.ac.in" pattern={isFirstYear?undefined:'[^@\\s]+@paruluniversity\\.ac\\.in'} onChange={handleEmailChange}/>
        {emailError&&<span className="field-error">{emailError}</span>}
        {isFirstYear&&<span className="field-hint">Don&apos;t have your university email yet? No problem — just provide your personal email below.</span>}
      </label>

      <label className="field">
        Personal email{isFirstYear?'':' (optional)'}
        <input name="personalEmail" type="email" maxLength={200} required={isFirstYear} placeholder="your.email@gmail.com"/>
        {isFirstYear&&<span className="field-hint">Required for 1st year students.</span>}
      </label>

      <label className="field">Mobile number<input name="phone" type="tel" maxLength={200} required placeholder="Mobile number"/></label>
      <label className="field">Institute<input name="institute" type="text" maxLength={200} required placeholder="Institute"/></label>
      <label className="field">Department<input name="department" type="text" maxLength={200} required placeholder="Department"/></label>
      <label className="field">Division<input name="division" type="text" maxLength={200} required placeholder="Division"/></label>

      <h2 className="form-section-title">02 / Follow your curiosity</h2>
      <label className="field">Technical skill level<select name="skillLevel">{['Beginner','Intermediate','Advanced'].map(v=><option key={v}>{v}</option>)}</select></label>

      <label className="field full">Why do you want to join?<textarea name="motivation" required minLength={20} maxLength={3000} placeholder="Tell us what you're curious about, what you want to build, or what you hope to learn."/></label>
      <label className="field full">Previous projects or experience (optional)<textarea name="experience" maxLength={3000} placeholder="Everyone starts somewhere. It's completely okay if you're just getting started."/></label>
      {([['github','GitHub'],['linkedin','LinkedIn'],['portfolio','Portfolio']] as const).map(([name,label])=>
        <label className="field" key={name}>{label} (optional)<input type="url" name={name} placeholder="https://"/></label>
      )}
    </div>
    <label style={{display:'flex',gap:10,margin:'22px 0',alignItems:'flex-start',fontSize:11,lineHeight:1.8}}>
      <input type="checkbox" name="consent" required style={{width:16,marginTop:4}}/>
      <span>I confirm these details are accurate and agree to the <Link href="/privacy" style={{textDecoration:'underline'}}>privacy notice</Link> for club membership administration.</span>
    </label>
    {error&&<p className="error-message" role="alert">{error}</p>}
    <button className="primary-button" type="submit" disabled={busy}>{busy?'Sending your application…':'Let\u0027s start something'}<ArrowUpRight size={18}/></button>
    <p className="form-help">Your application is saved only when you receive a candidate ID.</p>
  </form>
}

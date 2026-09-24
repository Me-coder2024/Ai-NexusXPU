'use client';
import {useState} from 'react';
import Link from 'next/link';
import {Menu, X, ArrowUpRight} from 'lucide-react';
import {Brand} from './brand';
export function Header(){const[open,setOpen]=useState(false);return <header className="site-header"><Brand/><nav className={open?'nav open':'nav'} aria-label="Main navigation">{[['About','/#about'],['Learning','/#learning'],['Research','/#research'],['Events','/#events'],['Community','/#community'],['Member login','/login']].map(([t,h])=><Link key={t} href={h} onClick={()=>setOpen(false)}>{t}</Link>)}</nav><Link className="nav-join" href="/apply">Join AI Nexus <ArrowUpRight size={14}/></Link><button className="menu-button" onClick={()=>setOpen(!open)} aria-label={open?'Close navigation':'Open navigation'} aria-expanded={open}>{open?<X/>:<Menu/>}</button></header>}


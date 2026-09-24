import Link from 'next/link';
import {PageShell} from '@/components/page-shell';
export default function NotFound(){return <PageShell><span className="eyebrow">404 / UNEXPLORED TERRITORY</span><h1 className="page-title">LET’S GET YOU<br/>BACK TO NEXUS.</h1><p className="page-description">This page may have moved, or it isn’t here yet.</p><Link href="/" className="primary-button">Back home ↗</Link></PageShell>}

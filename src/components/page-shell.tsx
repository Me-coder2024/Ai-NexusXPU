import Link from 'next/link';
import {ArrowLeft} from 'lucide-react';
import {Header} from './header';
export function PageShell({children}:{children:React.ReactNode}){return <main className="inner-shell"><Header/><div className="inner-content"><Link href="/" className="back-link"><ArrowLeft size={13}/> Back to the community</Link>{children}</div></main>}

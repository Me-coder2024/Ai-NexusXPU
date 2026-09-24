import type { Metadata } from 'next';
import '@fontsource/archivo-black/latin-400.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import '@fontsource/dm-sans/latin-800.css';
import './globals.css';
export const metadata: Metadata = {title: 'AI Nexus — Build the future. Together.', description: 'The student AI ecosystem at Parul University. Learn AI, build real projects, research new possibilities, and find your people.'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>}

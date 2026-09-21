import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { ThemeProvider } from '@/components/theme-provider';

import './globals.css';

export const metadata: Metadata = {
  title: 'OpenType Tutor',
  description: 'Treinador de digitação adaptativo',
};

const ANTI_FOUC_SCRIPT = `(function(){try{var t=localStorage.getItem('ott-theme');var d=document.documentElement;if(t==='light'){d.setAttribute('data-theme','light')}else{d.setAttribute('data-theme','dark')}}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>): ReactNode {
  return (
    <html lang="pt-BR" data-theme="dark">
      <body className="min-h-screen bg-canvas text-ink antialiased">
        <script dangerouslySetInnerHTML={{ __html: ANTI_FOUC_SCRIPT }} />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
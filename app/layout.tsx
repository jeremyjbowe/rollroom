import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Rollroom · Make every roll count',description:'A measured product library and simple roll-length calculator for the press room.',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}

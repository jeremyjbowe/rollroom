'use client';
import {useEffect,useRef,useState} from 'react';
import {ChevronDown} from 'lucide-react';
import type {Product} from '../lib/calculator';

export default function MaterialPicker({products,value,onChange,disabled,loading}:{products:Product[];value:string;onChange:(id:string)=>void;disabled:boolean;loading:boolean}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[cursor,setCursor]=useState(0);
 const input=useRef<HTMLInputElement>(null),list=useRef<HTMLUListElement>(null);
 const selected=products.find(p=>p.id===value&&p.active);
 const matches=products.filter(p=>p.active&&`${p.name} ${p.sku}`.toLowerCase().includes(query.trim().toLowerCase()));
 const index=Math.min(cursor,matches.length-1);
 const expanded=open&&!disabled;
 const label=(p:Product)=>p.name+(p.sku?' · '+p.sku:'');
 function choose(p:Product){onChange(p.id);setOpen(false);setQuery('');input.current?.focus();}
 useEffect(()=>{if(expanded)list.current?.children[index]?.scrollIntoView({block:'nearest'});},[index,expanded]);
 return <div className="material-picker" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget)){setOpen(false);setQuery('');}}}>
  <div className="material-control"><input ref={input} id="product" role="combobox" aria-autocomplete="list" aria-expanded={expanded} aria-controls="material-options" aria-activedescendant={expanded&&index>=0?`material-option-${matches[index].id}`:undefined} autoComplete="off" disabled={disabled} placeholder={loading?'Loading products…':'Search product name or SKU…'} value={expanded?query:selected?label(selected):''} onClick={()=>{setOpen(true);setCursor(0);}} onChange={e=>{setQuery(e.target.value);setCursor(0);setOpen(true);}} onKeyDown={e=>{
   if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setOpen(true);setCursor(!expanded?0:Math.max(0,Math.min(matches.length-1,cursor+(e.key==='ArrowDown'?1:-1))));}
   if(e.key==='Enter'&&expanded){e.preventDefault();if(matches[index])choose(matches[index]);}
   if(e.key==='Escape'){e.preventDefault();setOpen(false);setQuery('');}
  }}/><button type="button" tabIndex={-1} aria-label={expanded?'Close material list':'Show materials'} disabled={disabled} onMouseDown={e=>e.preventDefault()} onClick={()=>{setOpen(!expanded);setQuery('');setCursor(0);input.current?.focus();}}><ChevronDown size={16}/></button></div>
  {expanded&&<div className="material-menu"><ul ref={list} id="material-options" role="listbox" aria-label="Materials">{matches.map((p,i)=><li id={`material-option-${p.id}`} key={p.id} role="option" aria-selected={p.id===value} className={i===index?'highlighted':''} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(p)}><strong>{p.name}</strong>{p.sku&&<small>{p.sku}</small>}</li>)}</ul><div className="material-count" role="status">{matches.length?`${matches.length} material${matches.length===1?'':'s'}`:products.some(p=>p.active)?'No matching materials. Try another name or SKU.':'No active materials yet.'}</div></div>}
 </div>;
}

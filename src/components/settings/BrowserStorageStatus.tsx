'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Button } from '@/components/ui/button';

export default function BrowserStorageStatus() {
  const [status,setStatus] = useState<{usage:number;quota:number;persistent:boolean}|null>(null);
  const [message,setMessage] = useState('');
  const [busy,setBusy] = useState(false);
  useEffect(()=>{
    if(Capacitor.isNativePlatform() || !navigator.storage?.estimate) return;
    let cancelled=false;
    void Promise.all([navigator.storage.estimate(),navigator.storage.persisted?.() ?? false]).then(([estimate,persistent])=>{
      if(!cancelled)setStatus({usage:estimate.usage ?? 0,quota:estimate.quota ?? 0,persistent});
    }).catch(()=>{});
    return ()=>{cancelled=true;};
  },[]);
  if(!status) return null;
  return <div className="space-y-2 rounded-md border px-3 py-3 text-sm">
    <p className="font-medium">Datos en este navegador</p>
    <p className="text-xs text-muted-foreground">Uso aproximado: {(status.usage/1048576).toFixed(1)} MB{status.quota>0 ? ` de ${Math.floor(status.quota/1048576)} MB disponibles para este sitio` : ''}.</p>
    <p className="text-xs text-muted-foreground">{status.persistent ? 'Conservación persistente concedida por el navegador.' : 'El navegador puede liberar estos datos si necesita espacio. Conserva una copia de seguridad.'}</p>
    {!status.persistent && typeof navigator.storage.persist==='function' && <Button size="sm" variant="outline" disabled={busy} onClick={async()=>{
      setBusy(true);
      try {
        const persistent=await navigator.storage.persist();
        setStatus({...status,persistent});
        setMessage(persistent ? 'Conservación habilitada.' : 'El navegador no concedió la conservación persistente. Puedes seguir usando y respaldando tus datos.');
      } catch {setMessage('No se pudo solicitar la conservación. Intenta nuevamente.');}
      finally {setBusy(false);}
    }}>Conservar datos</Button>}
    {message && <p role="status" className="text-xs">{message}</p>}
  </div>;
}

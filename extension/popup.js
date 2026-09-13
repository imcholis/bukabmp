function el(id){return document.getElementById(id)}
async function send(type, extra={}){return await chrome.runtime.sendMessage({type,...extra})}

const ACTIVATION_LONG_WAIT_MS = 90_000;
let activationChecking = false;

function formatDate(ms){
  if(!ms) return "";
  return new Intl.DateTimeFormat("id-ID",{day:"numeric",month:"short",year:"numeric"}).format(new Date(ms));
}
function formatElapsed(ms){
  const total=Math.max(0,Math.floor(ms/1000));
  const min=Math.floor(total/60);
  const sec=String(total%60).padStart(2,"0");
  return `${min}:${sec}`;
}
function humanStatus(s){
  const x=s.status||"IDLE";
  if(!s.running&&x==="IDLE")return["Siap","Buka halaman reader pada tab aktif, lalu tekan Mulai."];
  if(x==="STARTING")return["Menyiapkan","Menyiapkan dokumen..."];
  if(x.startsWith("OPENING_M"))return["Membuka modul",s.progress||""];
  if(x.startsWith("DOWNLOADING_M"))return["Sedang diproses",s.progress||""];
  if(x.startsWith("OCR_FINALIZING_M"))return["Menyusun PDF","Halaman selesai. Menyusun file PDF..."];
  if(x.startsWith("M")&&x.endsWith("_PDF_READY"))return["PDF siap",s.progress||""];
  if(x==="BUILDING_FULL")return["Menggabungkan PDF",s.progress||""];
  if(x==="DONE"||x==="MAX_MODULE_REACHED")return["Selesai",s.progress||"Semua modul selesai."];
  if(x==="END_CANDIDATE")return["Selesai",s.progress||"Kandidat modul terakhir terdeteksi."];
  if(x==="LOGIN_REQUIRED")return["Perlu login","Sesi sumber meminta login ulang. Login kembali lalu mulai lagi."];
  if(x==="BLOCKED")return["Akses dihentikan","Server menolak permintaan. Proses dihentikan tanpa mencoba ulang."];
  if(x==="STOPPED_BY_USER")return["Dihentikan","Proses dihentikan."];
  if(x==="ERROR")return["Terjadi kendala",s.progress||"Proses tidak dapat dilanjutkan."];
  return["Sedang berjalan",s.progress||""];
}
function ocrProgress(text){
  if(!text)return{label:"",percent:null};
  const m=String(text).match(/(\d{1,3})%\s*$/);
  return{label:text,percent:m?Math.max(0,Math.min(100,Number(m[1]))):null};
}
function renderPendingActivation(a){
  const pending=a?.pending;
  const isPending=Boolean(pending&&!a.active);
  el("pairBox").style.display=isPending?"block":"none";
  el("checkActivation").style.display=isPending?"block":"none";
  el("activationWait").style.display=isPending?"block":"none";
  el("pairCode").textContent=pending?.pairId||"";

  if(!isPending){
    el("retryBox").style.display="none";
    return;
  }

  const started=Number(pending.startedAt||0);
  const elapsed=started?Date.now()-started:0;
  el("activationWaitTitle").textContent=
    activationChecking?"Memeriksa aktivasi...":"Menunggu verifikasi Telegram";
  el("activationWaitMeta").textContent=
    `${activationChecking?"Menghubungi layanan aktivasi":"Memeriksa otomatis"} • ${formatElapsed(elapsed)}`;

  const longWait=elapsed>=ACTIVATION_LONG_WAIT_MS;
  el("retryBox").style.display=longWait?"block":"none";
  if(longWait){
    el("activationText").textContent=
      "Belum selesai setelah beberapa saat. Status Telegram bisa membutuhkan waktu untuk sinkron. Coba Cek sekarang; jika masih sama, pilih Ulangi.";
  }
}
async function refreshAccess(){
  const a=await send("GET_ACCESS_STATUS");
  el("activationScreen").classList.toggle("active",!a.active);
  el("mainScreen").classList.toggle("active",Boolean(a.active));

  el("joinChannel").disabled=!a.configReady;
  el("joinGroup").disabled=!a.configReady;
  el("verifyTelegram").disabled=!a.configReady||Boolean(a.pending);

  renderPendingActivation(a);

  if(!a.configReady){
    el("activationText").textContent="Build ini belum dikonfigurasi oleh pengelola.";
  }else if(a.pending&&!a.active){
    const started=Number(a.pending.startedAt||0);
    const elapsed=started?Date.now()-started:0;
    if(elapsed<ACTIVATION_LONG_WAIT_MS){
      el("activationText").textContent=
        "Setelah bot menyatakan aktivasi berhasil, popup akan mendeteksinya otomatis. Jika Telegram tidak membawa kode, salin kode aktivasi di atas lalu kirim ke bot.";
    }
  }else if(!a.active){
    el("activationText").textContent=
      "Aktivasi berlaku terbatas waktu dan dapat diperbarui selama kamu masih menjadi anggota komunitas.";
  }

  if(a.active&&a.expiresAt){
    el("accessBadge").textContent=`● Akses komunitas aktif hingga ${formatDate(a.expiresAt)}`;
  }
  return a;
}
async function refreshState(){
  const r=await send("GET_STATE");
  const s=r?.state||{};
  const [title,text]=humanStatus(s);
  el("statusTitle").textContent=title;
  el("statusText").textContent=text;
  const completed=s.completedModules||[];
  el("completed").textContent=completed.length?`PDF selesai: ${completed.map(x=>"Modul "+x).join(", ")}`:"";
  const o=ocrProgress(s.ocrProgress||"");
  if(s.running&&o.label){
    el("ocrWrap").style.display="block";
    el("ocrLabel").textContent=o.label;
    el("ocrBar").style.width=o.percent==null?"8%":`${o.percent}%`;
  }else{
    el("ocrWrap").style.display="none";
    el("ocrBar").style.width="0%";
  }
  el("start").disabled=Boolean(s.running);
  el("stop").disabled=!s.running;
}

el("joinChannel").addEventListener("click",()=>send("OPEN_CHANNEL"));
el("channelLink").addEventListener("click",()=>send("OPEN_CHANNEL"));
el("joinGroup").addEventListener("click",()=>send("OPEN_GROUP"));
el("groupLink").addEventListener("click",()=>send("OPEN_GROUP"));

el("copyPairCode").addEventListener("click",async()=>{
  const code=el("pairCode").textContent.trim();
  if(!code)return;
  try{
    await navigator.clipboard.writeText(code);
    el("copyPairCode").textContent="Tersalin";
    setTimeout(()=>{el("copyPairCode").textContent="Salin kode"},1200);
  }catch(e){
    el("activationText").textContent="Gagal menyalin otomatis. Pilih kode aktivasi lalu salin manual.";
  }
});

async function checkPendingActivation({quiet=false}={}){
  if(activationChecking)return await send("GET_ACCESS_STATUS");
  const a=await send("GET_ACCESS_STATUS");
  if(a?.active||!a?.pending)return a;

  activationChecking=true;
  el("checkActivation").disabled=true;
  renderPendingActivation(a);
  if(!quiet)el("activationText").textContent="Memeriksa status aktivasi...";

  try{
    const r=await send("CHECK_PAIRING");
    if(r?.ok&&r.result?.status==="verified"){
      return await refreshAccess();
    }
    if(r?.ok&&r.result?.status==="expired"){
      el("activationText").textContent="Sesi verifikasi kedaluwarsa. Pilih Ulangi untuk membuat sesi baru.";
      await refreshAccess();
    }
  }catch(e){
    if(!quiet){
      el("activationText").textContent=
        `Belum bisa memeriksa aktivasi: ${String(e?.message||e)}. Coba lagi sebentar.`;
    }
  }finally{
    activationChecking=false;
    el("checkActivation").disabled=false;
    await refreshAccess();
  }
  return await send("GET_ACCESS_STATUS");
}

async function beginPairing(){
  el("verifyTelegram").disabled=true;
  el("activationText").textContent="Menyiapkan verifikasi...";
  try{
    const r=await send("START_PAIRING");
    if(!r?.ok)throw new Error(r?.error||"Verifikasi tidak dapat dimulai.");
    await refreshAccess();
  }catch(e){
    el("activationText").textContent=String(e?.message||e);
  }finally{
    await refreshAccess();
  }
}

el("verifyTelegram").addEventListener("click",beginPairing);
el("openTelegramAgain").addEventListener("click",async()=>{
  try{await send("OPEN_PENDING_TELEGRAM")}
  catch(e){el("activationText").textContent=String(e?.message||e)}
});
el("retryActivation").addEventListener("click",async()=>{
  el("retryActivation").disabled=true;
  el("activationText").textContent="Membuat sesi verifikasi baru...";
  try{
    await send("RESET_PAIRING");
    await beginPairing();
  }finally{
    el("retryActivation").disabled=false;
  }
});
el("checkActivation").addEventListener("click",()=>checkPendingActivation({quiet:false}));

el("start").addEventListener("click",async()=>{
  const tabs=await chrome.tabs.query({active:true,currentWindow:true});
  const tab=tabs[0];
  if(!tab?.id||!tab.url?.startsWith("https://pustaka.ut.ac.id/reader/")){
    el("statusTitle").textContent="Buka reader terlebih dahulu";
    el("statusText").textContent="Tab aktif harus berada pada halaman reader yang didukung.";
    return;
  }
  const startModule=Number(el("startModule").value);
  const maxModule=Number(el("maxModule").value);
  if(!Number.isInteger(startModule)||!Number.isInteger(maxModule)||startModule<1||maxModule<startModule){
    el("statusTitle").textContent="Periksa modul";
    el("statusText").textContent="Modul terakhir harus sama atau lebih besar dari modul pertama.";
    return;
  }
  const res=await send("START_JOB",{
    tabId:tab.id,
    code:el("code").value.trim().toUpperCase(),
    startModule,maxModule
  });
  if(!res?.ok){
    el("statusTitle").textContent="Gagal memulai";
    el("statusText").textContent=res?.error||"Terjadi kesalahan.";
  }
  await refreshState();
});

el("stop").addEventListener("click",async()=>{await send("STOP_JOB");await refreshState()});
el("about").addEventListener("click",()=>chrome.tabs.create({url:chrome.runtime.getURL("about.html")}));

(async()=>{
  await refreshAccess();
  await refreshState();
  setInterval(async()=>{await refreshAccess();await refreshState()},1000);
  setInterval(async()=>{
    const a=await send("GET_ACCESS_STATUS");
    if(a?.pending&&!a?.active)await checkPendingActivation({quiet:true});
  },2000);
})();

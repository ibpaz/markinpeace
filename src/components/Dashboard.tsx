import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../firebase';
import { Modal } from './Modal';

// Tipagens seguras para o TypeScript
interface UserProps {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
}

interface SpaceProps {
  id: string;
  name: string;
  location?: string;
  capacity: string;
  imageUrl?: string;
  infra?: string;
  observations?: string;
  checkoutItems?: string;
  inactive?: boolean;
}

interface ReservationProps {
  id: string;
  spaceId: string;
  spaceName: string;
  eventTitle: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  requesterId: string;
  requesterName: string;
  requesterPhone: string;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'bloqueio';
  checkoutDone?: boolean;
  recurrenceCount?: number;
  rejectionReason?: string;
  batchId?: string;
}

interface DashboardProps {
  user: UserProps & { email: string };
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [view, setView] = useState('spaces');
  const [spaces, setSpaces] = useState<SpaceProps[]>([]);
  const [usersList, setUsersList] = useState<UserProps[]>([]);
  const [reservations, setReservations] = useState<ReservationProps[]>([]);
  
  // Estados dos Modais originais
  const [bookingSpace, setBookingSpace] = useState<SpaceProps | null>(null);
  const [blockingSpace, setBlockingSpace] = useState(false);
  const [checkoutRes, setCheckoutRes] = useState<ReservationProps | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ date: string; events: ReservationProps[] } | null>(null);
  const [viewObs, setViewObs] = useState<SpaceProps | null>(null);
  const [rejectModal, setRejectModal] = useState<ReservationProps | null>(null);
  const [editingUser, setEditingUser] = useState<UserProps | null>(null);
  const [editingSpace, setEditingSpace] = useState<SpaceProps | null>(null);
  const [creatingSpace, setCreatingSpace] = useState(false);
  
  // Estados de Calendário e Filtros originais
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [fDate, setFDate] = useState('');
  const [fSpace, setFSpace] = useState('');
  const [fPerson, setFPerson] = useState('');
  const [hidePast, setHidePast] = useState(true);
  const [hideInstitutional, setHideInstitutional] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [locFilter, setLocFilter] = useState('');
  const [capFilter, setCapFilter] = useState('');
  
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const reasonRef = useRef<HTMLTextAreaElement>(null); // Referência moderna para o motivo da recusa

  const isAdmin = user.role === 'admin' || user.email === "adminmestreibpaz@igreja.com";
  const ADMIN_ZAP = "31984078703";

  // Funções Utilitárias idênticas às originais
  const fmtDataBR = (s: string) => s ? s.split('-').reverse().join('/') : "";
  const isEventPast = (date: string, end: string) => new Date(`${date}T${end}`) < new Date();
  const isEventStarted = (date: string, start: string) => new Date(`${date}T${start}`) < new Date();

  const askZap = (tel: string, msg: string, callback?: () => void) => {
    const send = confirm("Confirmar envio via WhatsApp?");
    if (send) {
      const n = tel.replace(/\D/g, '');
      window.open(`https://api.whatsapp.com/send?phone=55${n}&text=${encodeURIComponent(msg)}`, '_blank');
    }
    if (callback) callback();
  };

  // Conexão em tempo real com o Firebase (Padrão v8 compat)
  useEffect(() => {
    db.ref('spaces').on('value', s => setSpaces(s.val() ? Object.entries(s.val()).map(([id, v]: any) => ({ id, ...v })) : []));
    db.ref('users').on('value', s => setUsersList(s.val() ? Object.entries(s.val()).map(([id, v]: any) => ({ id, ...v })) : []));
    db.ref('reservations').on('value', s => setReservations(s.val() ? Object.entries(s.val()).map(([id, v]: any) => ({ id, ...v })) : []));
    
    return () => {
      db.ref('spaces').off();
      db.ref('users').off();
      db.ref('reservations').off();
    };
  }, []);

  // Scroll Suave idêntico ao original
  useEffect(() => {
    if (isFirstLoad) {
      setIsFirstLoad(false);
      return;
    }
    if (window.scrollY < 100 || (searchTerm || locFilter || capFilter)) {
      const timer = setTimeout(() => {
        const elemento = document.getElementById('conteudo-principal');
        if (elemento) {
          elemento.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [view, searchTerm, locFilter, capFilter]);

  const checkConflict = (spaceId: string, date: string, start: string, end: string, excludeId: string | null = null) => {
    return reservations.some(r => {
      if (r.id === excludeId || r.spaceId !== spaceId || r.date !== date || r.status === 'rejeitado') return false;
      return (start < r.endTime && end > r.startTime);
    });
  };

  const pendingCheckoutBlock = useMemo(() => {
    return reservations.some(r => r.requesterId === user.id && r.status === 'aprovado' && !r.checkoutDone && isEventPast(r.date, r.endTime));
  }, [reservations, user.id]);

  const calendarDays = useMemo(() => {
    const first = new Date(calYear, calMonth, 1).getDay();
    const days = new Date(calYear, calMonth + 1, 0).getDate();
    const arr = Array(first).fill(null);
    for (let i = 1; i <= days; i++) {
      arr.push({ day: i, date: `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}` });
    }
    return arr;
  }, [calMonth, calYear]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#041d2c] text-white">
      {/* Menu Lateral */}
         <nav className="w-full md:w-72 sidebar-dark p-8 flex flex-col gap-2 shrink-0">
           <div className="flex flex-col items-center mb-8">
             <img 
               src="logo.png" 
               alt="Logo MarkinPeace" 
               className="w-24 h-auto object-contain opacity-90" 
             />
             <div className="h-[1px] w-full bg-white/5 mt-6"></div>
           </div>
        <button onClick={() => setView('spaces')} className={view === 'spaces' ? 'nav-item active' : 'nav-item'}><span>🏢</span> Espaços</button>
        <button onClick={() => setView('calendar')} className={view === 'calendar' ? 'nav-item active' : 'nav-item'}><span>📅</span> Calendário</button>
        <button onClick={() => setView('my-bookings')} className={view === 'my-bookings' ? 'nav-item active' : 'nav-item'}><span>📄</span> Minhas Reservas</button>
        <button onClick={() => setView('public')} className={view === 'public' ? 'nav-item active' : 'nav-item'}><span>🔍</span> Visão Geral</button>
        
        {isAdmin && (
          <div className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-6">
            <button onClick={() => setView('approve')} className={view === 'approve' ? 'nav-item active' : 'nav-item'}><span>⌛</span> Pendentes</button>
            <button onClick={() => setView('users')} className={view === 'users' ? 'nav-item active' : 'nav-item'}><span>👤</span> Usuários</button>
            <button onClick={() => setView('manage-spaces')} className={view === 'manage-spaces' ? 'nav-item active' : 'nav-item'}><span>⚙️</span> Gestão Espaços</button>
          </div>
        )}
        <div className="mt-auto pt-6 text-[10px] text-cyan-400 font-black uppercase italic cursor-pointer" onClick={() => setEditingUser(user)}>Perfil: {user.name} ⚙️</div>
        <button onClick={onLogout} className="text-left py-4 font-black text-red-400 text-[10px] uppercase bg-transparent border-none cursor-pointer">Sair 🚪</button>
      </nav>

      {/* Painel Principal */}
      <main id="conteudo-principal" className="flex-1 p-5 md:p-12 overflow-auto">
        
        {/* ABA: ESPAÇOS */}
        {view === 'spaces' && (
          <div className="space-y-8">
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-3xl font-black uppercase italic text-white">Espaços</h2>
                <p className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em]">Selecione o local para sua reserva</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#0a3d5c]/30 p-6 rounded-[2.5rem] border border-white/5 shadow-2xl">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 ml-4">Nome do Espaço</label>
                  <select className="input-field !py-3" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}>
                    <option value="">Todos os espaços</option>
                    {[...new Set(spaces.map(s => s.name))].sort().map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 ml-4">Localização</label>
                  <select className="input-field !py-3" value={locFilter} onChange={e => setLocFilter(e.target.value)}>
                    <option value="">Todos os setores</option>
                    {[...new Set(spaces.map(s => s.location).filter(Boolean))].sort().map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 ml-4">Capacidade Mínima</label>
                  <input type="number" placeholder="Ex: 50" className="input-field !py-3" value={capFilter} onChange={e => setCapFilter(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {spaces
                .filter(s => searchTerm ? s.name === searchTerm : true)
                .filter(s => locFilter ? s.location === locFilter : true)
                .filter(s => capFilter ? parseInt(s.capacity) >= parseInt(capFilter) : true)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(s => {
                  const next = reservations.filter(r => r.spaceId === s.id && (r.status === 'aprovado' || r.status === 'bloqueio') && !isEventPast(r.date, r.endTime)).sort((a,b) => a.date.localeCompare(b.date)).slice(0, 3);
                  return (
                    <div key={s.id} className="card-round flex flex-col group hover:border-cyan-500/50 transition-all duration-500">
                      <div className="relative h-64 overflow-hidden rounded-t-[3rem]">
                        <div className="absolute top-5 left-5 z-10"><span className="tag-infra !bg-cyan-600/80 backdrop-blur-md">{s.location || 'Geral'}</span></div>
                        <div className="absolute top-5 right-5 z-10"><span className="tag-cap">Cap.: {s.capacity}</span></div>
                        <img src={s.imageUrl || 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?q=80&w=600'} className="w-full h-85 object-cover object-center brightness-75 group-hover:scale-110 transition-transform duration-700" />
{s.observations && <div className="btn-obs-float" onClick={() => setViewObs(s)}>!</div>}
                      </div>
                      <div className="p-8 flex-1 flex flex-col">
                        <h3 className="text-2xl font-black uppercase mb-4 tracking-tighter">{s.name}</h3>
                        <div className="flex flex-wrap gap-2 mb-6">{s.infra?.split(',').map((item, idx) => <span key={idx} className="tag-infra">{item.trim()}</span>)}</div>
                        <div className="mb-8 p-6 bg-[#0a3d5c]/60 rounded-[2rem] border border-cyan-900/30 flex-1">
                          <p className="text-[10px] font-black text-cyan-400 uppercase mb-4 tracking-widest">Próximas Marcações:</p>
                          {next.length > 0 ? next.map(nt => (
                            <div key={nt.id} className="flex justify-between items-center border-b border-white/5 pb-2 mb-2 last:border-0">
                              <div className="flex flex-col"><span className="text-[10px] font-black uppercase">{nt.eventTitle}</span><span className="text-[9px] text-orange-400 font-bold">{fmtDataBR(nt.date)}</span></div>
                              <span className="text-[10px] font-bold text-slate-300">{nt.startTime} - {nt.endTime}</span>
                            </div>
                          )) : <p className="text-[10px] italic text-slate-500">Sem eventos agendados.</p>}
                        </div>
                        <button disabled={pendingCheckoutBlock || s.inactive} onClick={() => setBookingSpace(s)} className="w-full py-5 btn-primary uppercase text-xs shadow-xl active:scale-95 transition-transform">
                          {pendingCheckoutBlock ? 'CHECKOUT PENDENTE' : s.inactive ? 'ESPAÇO INATIVO' : 'RESERVAR ESPAÇO'}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ABA: VISÃO GERAL */}
        {view === 'public' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
              <h2 className="text-2xl font-black uppercase italic text-cyan-400">Visão Geral</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 w-full md:w-auto">
                <input type="date" value={fDate} onChange={e => setFDate(e.target.value)} className="input-field !py-2 text-[10px]" />
                <select value={fSpace} onChange={e => setFSpace(e.target.value)} className="input-field !py-2 text-[10px]">
                  <option value="">Todos Locais</option>
                  {spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select value={fPerson} onChange={e => setFPerson(e.target.value)} className="input-field !py-2 text-[10px]">
                  <option value="">Todas Pessoas</option>
                  {[...new Set(reservations.map(r => r.requesterName))].sort().map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <label className="flex items-center justify-center gap-2 bg-[#0a3d5c] px-2 rounded-xl text-[9px] font-black uppercase cursor-pointer min-h-[38px]">
                  <input type="checkbox" checked={hidePast} onChange={e => setHidePast(e.target.checked)} className="custom-check !w-4 !h-4" /> 
                  <span className="leading-tight text-center">Ocultar Passados</span>
                </label>
                <label className="flex items-center justify-center gap-2 bg-[#0a3d5c] px-2 rounded-xl text-[9px] font-black uppercase cursor-pointer min-h-[38px]">
                  <input type="checkbox" checked={hideInstitutional} onChange={e => setHideInstitutional(e.target.checked)} className="w-4 h-4 cursor-pointer" /> 
                  <span className="leading-tight text-center">Ocultar Institucional</span>
                </label>
              </div>
            </div>
            <div className="grid gap-4">
              {reservations
                .filter(r => (r.status === 'aprovado' || r.status === 'bloqueio') && (fDate ? r.date === fDate : true) && (fSpace ? r.spaceId === fSpace : true) && (fPerson ? r.requesterName === fPerson : true) && (hidePast ? (!isEventPast(r.date, r.endTime) || !r.checkoutDone) : true) && (hideInstitutional ? r.status !== 'bloqueio' : true))
                .sort((a,b) => a.date.localeCompare(b.date))
                .map(r => (
                  <div key={r.id} className={`card-round p-6 flex flex-col md:flex-row justify-between items-center gap-6 border-l-4 ${r.status === 'bloqueio' ? 'border-slate-500 bg-slate-900/40' : 'border-cyan-400'}`}>
                    <div className="flex-1">
                      <h4 className="font-black text-lg uppercase text-white tracking-tight">{r.eventTitle}</h4>
                      {r.description && <p className="text-[11px] text-slate-400 italic mb-2">"{r.description}"</p>}
                      <p className="text-xs font-bold text-slate-300 uppercase">{fmtDataBR(r.date)} | {r.startTime} às {r.endTime} | {r.spaceName}</p>
                      <div className="flex gap-4 items-center mt-3">
                        <p className="text-[10px] font-black text-cyan-400 uppercase">Resp: {r.requesterName}</p>
                        {r.status !== 'bloqueio' && (
                          <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${r.checkoutDone ? 'bg-green-900/40 text-green-400' : (isEventPast(r.date, r.endTime) ? 'bg-orange-600 text-white animate-pulse-fast' : 'bg-blue-900/40 text-blue-400')}`}>
                            {r.checkoutDone ? '✓ Checkout OK' : (isEventPast(r.date, r.endTime) ? '⚠ Checkout Pendente' : 'Agendado')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-4 items-center flex-wrap justify-end">
                      {isAdmin && r.status !== 'bloqueio' && (
                        <button onClick={() => askZap(r.requesterPhone, `Olá ${r.requesterName}, sobre o evento "${r.eventTitle}"...`)} className="btn-zap-circle">💬</button>
                      )}
                      {isAdmin && (
                        <>
                          {r.status === 'bloqueio' && r.batchId && (
                            <button onClick={() => {
                              if(confirm('ATENÇÃO: Deseja excluir TODOS os bloqueios desta série (todas as datas)?')) {
                                const batch = reservations.filter(item => item.batchId === r.batchId);
                                batch.forEach(item => db.ref('reservations/'+item.id).remove());
                                alert(`${batch.length} bloqueios removidos!`);
                              }
                            }} className="bg-red-900/50 text-red-400 px-3 py-2 rounded-lg font-black text-[10px] uppercase border border-red-900 hover:bg-red-900 transition-colors">
                              Excluir Série
                            </button>
                          )}
                          <button onClick={() => {if(confirm('Excluir este item individualmente?')) db.ref('reservations/'+r.id).remove()}} className="text-red-500 font-black text-[10px] uppercase underline bg-transparent border-none cursor-pointer">
                            Excluir
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ABA: MINHAS RESERVAS */}
        {view === 'my-bookings' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
              <h2 className="text-2xl font-black uppercase italic text-cyan-400">Minhas Reservas</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 w-full md:w-auto">
                <input type="date" onChange={e => setFDate(e.target.value)} className="input-field !py-2 text-[10px]" />
                <select onChange={e => setFSpace(e.target.value)} className="input-field !py-2 text-[10px]"><option value="">Locais</option>{spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                <label className="flex items-center gap-2 bg-[#0a3d5c] px-3 rounded-xl text-[9px] font-black uppercase cursor-pointer"><input type="checkbox" checked={hidePast} onChange={e => setHidePast(e.target.checked)} className="custom-check !w-4 !h-4" /> Ocultar Passados</label>
              </div>
            </div>
            {reservations
              .filter(r => r.requesterId === user.id && (fDate ? r.date === fDate : true) && (fSpace ? r.spaceId === fSpace : true) && (hidePast ? (!isEventPast(r.date, r.endTime) || !r.checkoutDone) : true))
              .sort((a,b) => a.date.localeCompare(b.date))
              .map(r => (
                <div key={r.id} className="card-round p-6 flex flex-col md:flex-row justify-between items-center gap-6 border-l-4 border-cyan-400">
                  <div className="flex-1">
                    <h4 className="font-black uppercase text-lg">{r.eventTitle}</h4>
                    <p className="text-[11px] text-slate-400 italic mb-2">"{r.description}"</p>
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">{fmtDataBR(r.date)} | {r.startTime} às {r.endTime} | {r.spaceName}</p>
                    {r.status === 'rejeitado' && <div className="mt-3 p-3 bg-red-900/20 border border-red-900/30 rounded-xl"><p className="text-[10px] font-black uppercase text-red-400">Motivo da Recusa:</p><p className="text-[10px] italic text-red-200">{r.rejectionReason}</p></div>}
                    <div className="flex gap-3 mt-4">
                      <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${r.status === 'aprovado' ? 'bg-green-900/40 text-green-400' : r.status === 'rejeitado' ? 'bg-red-900/40 text-red-400' : 'bg-orange-900/40 text-orange-400'}`}>{r.status}</span>
                      {r.status === 'aprovado' && !r.checkoutDone && isEventStarted(r.date, r.startTime) && (
                        <button onClick={() => setCheckoutRes(r)} className="bg-orange-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase animate-pulse-fast shadow-lg">Fazer Checkout</button>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-4 items-center">
                    <button onClick={() => askZap(ADMIN_ZAP, `Olá Administrador, sobre minha reserva ${r.eventTitle}...`)} className="btn-zap-circle">💬</button>
                    <button onClick={() => {if(confirm('Excluir solicitação?')) db.ref('reservations/'+r.id).remove()}} className="text-red-400 font-black text-[10px] uppercase underline bg-transparent border-none cursor-pointer">Excluir</button>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* ABA: CALENDÁRIO */}
        {view === 'calendar' && (
          <div className="card-round p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-10">
              <h2 className="text-2xl font-black uppercase italic text-cyan-400">Agenda</h2>
              <div className="flex flex-wrap justify-center gap-2">
                <select value={calMonth} onChange={e => setCalMonth(parseInt(e.target.value))} className="input-field !py-2 !w-32">
                  {["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"].map((m,i)=><option key={i} value={i}>{m}</option>)}
                </select>
                <input type="number" value={calYear} onChange={e => setCalYear(parseInt(e.target.value))} className="input-field !py-2 !w-24" />
                <label className="flex items-center justify-center gap-2 bg-[#0a3d5c] px-3 rounded-xl text-[10px] font-black uppercase cursor-pointer h-[38px] border border-white/5">
                  <input type="checkbox" checked={hideInstitutional} onChange={(e) => setHideInstitutional(e.target.checked)} className="w-4 h-4 cursor-pointer" /> 
                  <span className="leading-tight">Ocultar Institucional</span>
                </label>
              </div>
            </div>
            <div className="calendar-wrapper">
              <div className="calendar-grid">
                {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(d => <div key={d} className="p-2 text-center text-[10px] font-black text-cyan-500 uppercase">{d}</div>)}
                {calendarDays.map((item, i) => {
                  if (!item) return <div key={i} className="calendar-day opacity-10"></div>;
                  const evs = reservations.filter(r => r.date === item.date && (r.status === 'aprovado' || r.status === 'bloqueio') && (!hideInstitutional || r.status !== 'bloqueio'));
                  return (
                    <div key={i} className="calendar-day" onClick={() => setSelectedDayEvents({date: item.date, events: evs})}>
                      <span className="text-xs font-black text-slate-500">{item.day}</span>
                      {evs.length > 0 && (
                        <div className="big-number flex flex-col items-center leading-none">
                          <span>{evs.length}</span>
                          <span className="text-[6px] md:text-[8px] tracking-widest text-slate-400 uppercase font-bold mt-1">
                            {evs.length === 1 ? 'EVENTO' : 'EVENTOS'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ABA ADMIN: GERENCIAR USUÁRIOS */}
        {isAdmin && view === 'users' && (
          <div className="card-round overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0a3d5c] font-black uppercase text-cyan-400 text-[10px]">
                <tr><th className="p-6">Usuário</th><th className="p-6 text-right">Ações</th></tr>
              </thead>
              <tbody>
                {usersList.map(u => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-6">
                      <p className="font-black uppercase">{u.name}</p>
                      <p className="text-[10px] text-slate-500">{u.email} | {u.phone}</p>
                    </td>
                    <td className="p-6 text-right space-x-4">
                      <button onClick={() => setEditingUser(u)} className="text-blue-400 font-black text-[10px] underline uppercase bg-transparent border-none cursor-pointer">Editar</button>
                      <button onClick={() => {if(confirm('Excluir?')) db.ref('users/'+u.id).remove()}} className="text-red-400 font-black text-[10px] underline uppercase bg-transparent border-none cursor-pointer">Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ABA ADMIN: GESTÃO DE ESPAÇOS */}
        {isAdmin && view === 'manage-spaces' && (
          <div className="space-y-6">
            <button onClick={() => setCreatingSpace(true)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase shadow-xl">+ Novo Espaço</button> 
            <button onClick={() => setBlockingSpace(true)} className="bg-slate-700 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase shadow-lg ml-4">⚠️ Bloqueio Institucional</button>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {spaces.map(s => (
                <div key={s.id} className="card-round p-8 flex flex-col items-center">
                  <h4 className="font-black uppercase text-lg mb-6">{s.name}</h4>
                  <div className="flex gap-4">
                    <button onClick={() => setEditingSpace(s)} className="text-blue-400 text-[10px] font-black uppercase underline bg-transparent border-none cursor-pointer">Editar</button>
                    <button onClick={() => db.ref('spaces/'+s.id).update({inactive: !s.inactive})} className={`${s.inactive ? 'text-green-400' : 'text-orange-400'} text-[10px] font-black uppercase underline bg-transparent border-none cursor-pointer`}>{s.inactive ? 'Ativar' : 'Inativar'}</button>
                    <button onClick={() => {if(confirm('Excluir?')) db.ref('spaces/'+s.id).remove()}} className="text-red-400 text-[10px] font-black uppercase underline bg-transparent border-none cursor-pointer">Excluir</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA ADMIN: PENDÊNCIAS */}
        {isAdmin && view === 'approve' && (
          <div className="space-y-10">
            <h2 className="text-2xl font-black uppercase italic text-cyan-400">Pendências</h2>
            
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Usuários Aguardando Acesso</h3>
              {usersList.filter(u => u.status === 'pendente').length === 0 ? (
                <p className="text-[10px] text-slate-600 uppercase font-black italic">Nenhum usuário pendente.</p>
              ) : (
                usersList.filter(u => u.status === 'pendente').map(u => (
                  <div key={u.id} className="card-round p-6 flex flex-col md:flex-row justify-between items-center gap-6 border-l-4 border-cyan-500 bg-[#0a3d5c]/30">
                    <div className="flex-1">
                      <h4 className="font-black uppercase text-lg text-white">{u.name}</h4>
                      <p className="text-xs font-bold text-cyan-400 uppercase">{u.phone}</p>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => db.ref('users/'+u.id).update({ status: 'aprovado' })} className="bg-green-600 px-6 py-3 rounded-xl text-[10px] font-black uppercase">Aprovar Acesso</button>
                      <button onClick={() => { if(confirm('Excluir solicitação?')) db.ref('users/'+u.id).remove() }} className="bg-red-900/30 text-red-500 px-6 py-3 rounded-xl text-[10px] font-black uppercase">Rejeitar</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-white/5 pt-10 space-y-4">
              <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Reservas Aguardando Aprovação</h3>
              {reservations.filter(r => r.status === 'pendente').length === 0 ? (
                <p className="text-[10px] text-slate-600 uppercase font-black italic">Nenhuma reserva pendente.</p>
              ) : (
                reservations.filter(r => r.status === 'pendente').map(r => (
                  <div key={r.id} className="card-round p-8 flex flex-col md:flex-row justify-between gap-8 border-l-4 border-orange-500">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2"><h4 className="font-black uppercase text-xl">{r.eventTitle}</h4>{r.recurrenceCount && r.recurrenceCount > 1 && <span className="bg-orange-900/40 text-orange-400 text-[9px] px-2 py-1 rounded-full font-black">RECORRENTE: {r.recurrenceCount}x</span>}</div>
                      <p className="text-sm font-bold text-orange-400 uppercase mb-3">{fmtDataBR(r.date)} | {r.startTime} - {r.endTime} | {r.spaceName}</p>
                      <div className="bg-[#041d2c] p-4 rounded-2xl mb-3"><p className="text-[10px] font-black text-cyan-400 uppercase mb-1">Descrição:</p><p className="text-xs italic text-slate-400">"{r.description}"</p></div>
                      <p className="text-[10px] font-black text-white uppercase">Solicitante: {r.requesterName}</p>
                    </div>
                    <div className="flex gap-3 items-center">
                      <button onClick={() => { 
                        if(checkConflict(r.spaceId, r.date, r.startTime, r.endTime, r.id)) return alert("Conflito de horário detectado!"); 
                        askZap(r.requesterPhone, `Sua reserva para ${r.eventTitle} foi APROVADA!`, () => db.ref('reservations/'+r.id).update({status:'aprovado'})); 
                      }} className="bg-blue-600 px-6 py-3 rounded-xl text-[10px] font-black uppercase">Aprovar</button>
                      <button onClick={() => setRejectModal(r)} className="bg-red-900/30 text-red-500 px-6 py-3 rounded-xl text-[10px] font-black uppercase">Recusar</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* ================= MODAIS INTEGRADOS E COMPATÍVEIS ================= */}
      {viewObs && (
        <Modal title={`Observações: ${viewObs.name}`} onClose={() => setViewObs(null)} isOpen={!!viewObs}>
          <div className="space-y-3">
            {viewObs.observations?.split(',').map((o, i) => (
              <div key={i} className="flex items-start gap-3 bg-[#0a3d5c] p-4 rounded-2xl border-l-4 border-yellow-500">
                <span className="text-yellow-500 font-black">✓</span>
                <p className="text-xs font-bold uppercase text-slate-200">{o.trim()}</p>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {bookingSpace && (
        <Modal title={`SOLICITAR: ${bookingSpace.name}`} onClose={() => setBookingSpace(null)} isOpen={!!bookingSpace}>
          <form className="space-y-5" onSubmit={(e) => {
            e.preventDefault(); const fd = new FormData(e.currentTarget);
            const date = fd.get('date') as string; const start = fd.get('start') as string; const end = fd.get('end') as string;
            const recurrence = fd.get('recurrence');
            let datesToBook = [date];
            if(recurrence !== 'none') {
              let current = new Date(date + "T00:00:00");
              for(let i=0; i < (recurrence === 'weekly' ? 23 : 5); i++) {
                if(recurrence === 'weekly') current.setDate(current.getDate() + 7);
                else current.setMonth(current.getMonth() + 1);
                datesToBook.push(current.toISOString().split('T')[0]);
              }
            }
            if(datesToBook.some(d => checkConflict(bookingSpace.id, d, start, end))) return alert("Horário Ocupado!");
            const finalize = () => {
              datesToBook.forEach(d => {
                const nr = db.ref('reservations').push();
                nr.set({ id: nr.key, spaceId: bookingSpace.id, spaceName: bookingSpace.name, eventTitle: fd.get('title'), description: fd.get('desc'), date: d, startTime: start, endTime: end, requesterId: user.id, requesterName: user.name, requesterPhone: user.phone, status: 'pendente', checkoutDone: false, recurrenceCount: datesToBook.length });
              });
              setBookingSpace(null); alert("Solicitado!");
            };
            askZap(ADMIN_ZAP, `Nova reserva de ${user.name} para ${bookingSpace.name}.`, finalize);
          }}>
            <div><label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Título do Evento</label><input name="title" required className="input-field" /></div>
            <div><label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">O que será realizado?</label><textarea name="desc" required className="input-field h-20"></textarea></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Data Inicial</label><input name="date" type="date" required className="input-field" /></div>
              <div><label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Repetir?</label><select name="recurrence" className="input-field"><option value="none">Única</option><option value="weekly">Semanal (6 meses)</option><option value="monthly">Mensal (6 meses)</option></select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Início</label><input name="start" type="time" required className="input-field" /></div>
              <div><label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Término</label><input name="end" type="time" required className="input-field" /></div>
            </div>
            <div className="bg-[#02111a] p-5 rounded-[2rem] border border-[#1e6091]/30">
              <h5 className="text-[10px] font-black uppercase mb-2 text-cyan-400">Termos de Responsabilidade:</h5>
              <div className="text-[9px] text-slate-400 leading-relaxed mb-4 space-y-1">
                <p>• O espaço deve ser entregue limpo e organizado.</p>
                <p>• Conferir se há equipamento de ar condicionado, som ou midia ligados. Esses equipamentos devem ser desligados após utilização do espaço.</p>
                <p>• O checklist de conferencia deve ser preenchido após a utilização do espaço.</p>
                <p>• Em caso de avarias no espaço a administração da igreja deve ser comunicada imediatamente.</p>
                <p>• Não colar fitas adesivas ou colocar pregos nas paredes.</p>
                <p>• A reserva dos espaços não inclui equipe para ligar/desligar equipamentos ou estruturas, caso necessário deverá ser consultada a disponibilidade previamente.</p>
                <p>• A reserva do espaço só estará confirmada após a aprovação da administração e disponível em "Minhas reservas" como "APROVADO". A solicitação até a aprovação não garante a disponibilidade do espaço solicitado.</p>
              </div>
              <label className="flex items-center gap-4 cursor-pointer"><input type="checkbox" required className="custom-check" /><span className="text-[10px] font-black uppercase">Li e concordo com os termos</span></label>
            </div>
            <button className="w-full btn-primary py-5 uppercase text-xs">Enviar para Aprovação</button>
          </form>
        </Modal>
      )}

      {(editingSpace || creatingSpace) && (
        <Modal title={creatingSpace ? "NOVO ESPAÇO" : "EDITAR ESPAÇO"} onClose={() => {setEditingSpace(null); setCreatingSpace(false);}} isOpen={creatingSpace || !!editingSpace}>
          <form className="space-y-4" onSubmit={(e) => { 
            e.preventDefault(); const fd = new FormData(e.currentTarget); 
            const data = { 
              name: fd.get('name') as string, 
              capacity: fd.get('cap') as string, 
              location: fd.get('loc') as string, 
              imageUrl: fd.get('img') as string, 
              infra: fd.get('infra') as string, 
              observations: fd.get('obs') as string, 
              checkoutItems: fd.get('checkout') as string 
            }; 
            if(creatingSpace) { 
              const nr = db.ref('spaces').push(); 
              nr.set({id: nr.key, ...data, inactive: false}); 
            } else if (editingSpace) { 
              db.ref('spaces/'+editingSpace.id).update(data); 
            } 
            setEditingSpace(null); setCreatingSpace(false); 
          }}>
            <div><label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Nome do Local</label><input name="name" defaultValue={editingSpace?.name} className="input-field" required /></div>
            <div><label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Localização (Ex: Prédio Sede, Hall, 1º Andar)</label><input name="loc" defaultValue={editingSpace?.location} className="input-field" placeholder="Ex: Prédio Principal" /></div>
            <div><label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Lotação Máxima</label><input name="cap" defaultValue={editingSpace?.capacity} className="input-field" required /></div>
            <div><label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Link da Imagem</label><input name="img" defaultValue={editingSpace?.imageUrl} className="input-field" /></div>
            <div><label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Infraestrutura (sep. vírgula)</label><input name="infra" defaultValue={editingSpace?.infra} className="input-field" /></div>
            <div><label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Observações de Destaque (sep. vírgula)</label><textarea name="obs" defaultValue={editingSpace?.observations} className="input-field h-20"></textarea></div>
            <div><label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Itens de Checkout (sep. vírgula)</label><textarea name="checkout" defaultValue={editingSpace?.checkoutItems} className="input-field h-20"></textarea></div>
            <button className="w-full btn-primary py-5 uppercase text-xs">Gravar Espaço</button>
          </form>
        </Modal>
      )}

      {checkoutRes && (
        <Modal title="CHECKOUT DE CONFERÊNCIA" onClose={() => setCheckoutRes(null)} isOpen={!!checkoutRes}>
          <div className="space-y-4">
            {(spaces.find(s => s.id === checkoutRes.spaceId)?.checkoutItems || "Limpeza geral realizada, Ar condicionado desligado, Luzes apagadas, Equipamentos de som guardados").split(',').map((it, idx) => (
              <label key={idx} className="flex items-center gap-4 bg-[#0a3d5c] p-4 rounded-2xl cursor-pointer">
                <input type="checkbox" required className="custom-check" /><span className="text-xs font-bold uppercase">{it.trim()}</span>
              </label>
            ))}
            <button onClick={() => { db.ref('reservations/'+checkoutRes.id).update({checkoutDone: true}); setCheckoutRes(null); alert("Checkout concluído!"); }} className="w-full btn-primary py-5 uppercase text-xs mt-4">Finalizar e Liberar</button>
          </div>
        </Modal>
      )}

      {selectedDayEvents && (
        <Modal title={`Agenda: ${fmtDataBR(selectedDayEvents.date)}`} onClose={() => setSelectedDayEvents(null)} isOpen={!!selectedDayEvents}>
          <div className="space-y-4">
            {selectedDayEvents.events.length === 0 ? <p className="text-center text-slate-500 py-10">Sem eventos.</p> : selectedDayEvents.events.map(e => (
              <div key={e.id} className="p-5 bg-[#0a3d5c] rounded-[1.5rem] border-l-4 border-cyan-400">
                <h4 className="font-black uppercase text-cyan-400 text-sm">{e.eventTitle}</h4>
                <p className="text-[10px] font-bold text-slate-300">{e.startTime} - {e.endTime} | {e.spaceName}</p>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {editingUser && (
        <Modal title="EDITAR PERFIL" onClose={() => setEditingUser(null)} isOpen={!!editingUser}>
          <form className="space-y-4" onSubmit={(e) => { 
            e.preventDefault(); const fd = new FormData(e.currentTarget);
            const up: any = { name: fd.get('name'), phone: fd.get('phone') };
            if(isAdmin) { up.role = fd.get('role'); }
            db.ref('users/'+editingUser.id).update(up); 
            setEditingUser(null); alert("Dados atualizados com sucesso!");
          }}>
            <div><label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Nome Completo</label><input name="name" defaultValue={editingUser.name} className="input-field" /></div>
            <div><label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">WhatsApp</label><input name="phone" defaultValue={editingUser.phone} className="input-field" /></div>
            {isAdmin && (
              <div className="pt-4 mt-4 border-t border-white/10">
                <label className="text-[10px] font-black uppercase text-cyan-400 mb-1 block">Nível de Acesso (Cargo)</label>
                <select name="role" defaultValue={editingUser.role || 'membro'} className="input-field">
                  <option value="membro">Membro (Padrão)</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            )}
            <button className="w-full btn-primary py-4 uppercase text-xs mt-4">Salvar Alterações</button>
          </form>
        </Modal>
      )}

      {rejectModal && (
        <Modal title="RECUSAR" onClose={() => setRejectModal(null)} isOpen={!!rejectModal}>
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Informe o Motivo</label>
            <textarea ref={reasonRef} className="input-field h-32" placeholder="Digite o motivo da recusa..."></textarea>
            <button onClick={() => {
              const r = reasonRef.current?.value; 
              if(!r) return alert("Motivo obrigatório.");
              askZap(rejectModal.requesterPhone, `Reserva para ${rejectModal.eventTitle} recusada. Motivo: ${r}`, () => db.ref('reservations/'+rejectModal.id).update({status:'rejeitado', rejectionReason: r}));
              setRejectModal(null);
            }} className="w-full bg-red-600 py-5 rounded-2xl font-black uppercase text-xs text-white">Confirmar Recusa</button>
          </div>
        </Modal>
      )}

      {blockingSpace && (
        <Modal title="BLOQUEIO INSTITUCIONAL" onClose={() => setBlockingSpace(false)} isOpen={blockingSpace}>
          <form className="space-y-5" onSubmit={(e) => {
            e.preventDefault(); const fd = new FormData(e.currentTarget);
            const sp = spaces.find(s => s.id === fd.get('spaceId'));
            const days = Array.from(fd.getAll('days')).map(Number);
            const batchId = Date.now().toString(); 
            let curr = new Date(); const endY = new Date(curr.getFullYear(), 11, 31);
            if(!sp) return;
            while(curr <= endY) {
              if(days.includes(curr.getDay())) {
                const y = curr.getFullYear(); const m = String(curr.getMonth() + 1).padStart(2, '0'); const d = String(curr.getDate()).padStart(2, '0');
                const dataF = `${y}-${m}-${d}`;
                const nr = db.ref('reservations').push();
                nr.set({ id: nr.key, spaceId: sp.id, spaceName: sp.name, eventTitle: `[FIXO] ${fd.get('title')}`, date: dataF, startTime: fd.get('start'), endTime: fd.get('end'), requesterName: "INSTITUCIONAL", status: 'bloqueio', batchId: batchId });
              }
              curr.setDate(curr.getDate()+1);
            }
            alert("Bloqueio realizado com sucesso!"); setBlockingSpace(false);
          }}>
            <div><label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Título (Ex: Escola / Culto)</label><input name="title" required className="input-field" /></div>
            <div><label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Local</label><select name="spaceId" required className="input-field">{spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div className="flex flex-wrap gap-2 my-4">
              {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map((d,i)=>(<label key={i} className="flex items-center gap-1 bg-[#0a3d5c] p-2 rounded-lg text-[10px] font-bold cursor-pointer hover:bg-[#0e4b6e]"><input type="checkbox" name="days" value={i} className="custom-check !w-4 !h-4" /> {d}</label>))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Início</label><input name="start" type="time" required className="input-field" /></div>
              <div><label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Fim</label><input name="end" type="time" required className="input-field" /></div>
            </div>
            <button className="w-full btn-primary py-5 uppercase text-xs mt-4">Confirmar Bloqueio</button>
          </form>
        </Modal>
      )}
    </div>
  );
};
import React, { useState } from 'react';
import { auth, db } from '../firebase';

interface AuthProps {
  onLoginSuccess: () => void;
}

export const Auth: React.FC<AuthProps> = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('pass') as string;
    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string;

    try {
      if (isLogin) {
        // Login Clássico
        await auth.signInWithEmailAndPassword(email, password);
      } else {
        // Cadastro de Novo Usuário (Membro Pendente)
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        if (userCredential.user) {
          await db.ref('users/' + userCredential.user.uid).set({
            id: userCredential.user.uid,
            name: name,
            phone: phone,
            role: 'membro',
            status: 'pendente'
          });
          alert("Solicitação enviada! Aguarde a aprovação da administração.");
          setIsLogin(true);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocorreu um erro. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#02111a] p-6">
      <div className="bg-[#041d2c] border border-[#1e6091] p-10 rounded-[3.5rem] w-full max-w-md text-center">
        
        {/* Cabeçalho */}
        <div className="flex justify-center mb-8">
          <p className="text-xl font-black text-cyan-400 uppercase tracking-[0.2em]">
            MarkInPeace
          </p>
        </div>

        {/* Alerta de Erro */}
        {error && (
          <div className="mb-4 rounded-xl bg-red-900/20 border border-red-900/50 p-4 text-xs text-red-400 text-left">
            {error}
          </div>
        )}

        {/* Formulário Dinâmico */}
        <form className="space-y-4 text-left" onSubmit={handleAuth}>
          {!isLogin && (
            <>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Nome</label>
                <input name="name" required className="input-field" placeholder="Seu nome completo" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">WhatsApp</label>
                <input name="phone" required className="input-field" placeholder="Ex: 31984078703" />
              </div>
            </>
          )}

          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">E-mail</label>
            <input name="email" type="email" required className="input-field" placeholder="seu-email@igreja.com" />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Senha</label>
            <input name="pass" type="password" required className="input-field" placeholder="••••••••" />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full btn-primary py-5 uppercase text-sm mt-4 disabled:opacity-50"
          >
            {loading ? 'Processando...' : isLogin ? 'ENTRAR' : 'SOLICITAR ACESSO'}
          </button>
        </form>

        {/* Alternador de Telas */}
        <button 
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
          }} 
          className="mt-8 text-[11px] font-black uppercase text-cyan-400 underline tracking-widest bg-transparent border-none cursor-pointer outline-none"
        >
          {isLogin ? 'Solicitar Acesso' : 'Voltar'}
        </button>
      </div>
    </div>
  );
};
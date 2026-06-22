import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        try {
          // Procura o cadastro do utilizador na base de dados em tempo real
          const snapshot = await db.ref('users/' + currentUser.uid).once('value');
          const userData = snapshot.val();

          // Validação idêntica à original
          if (currentUser.email === "adminmestreibpaz@igreja.com" || (userData && userData.status === 'aprovado')) {
            setUser({ 
              id: currentUser.uid, 
              email: currentUser.email,
              ...userData 
            });
          } else {
            alert("Aguarde aprovação da administração.");
            auth.signOut();
            setUser(null);
          }
        } catch (error) {
          console.error("Erro ao carregar dados do utilizador:", error);
          auth.signOut();
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen bg-[#02111a] flex flex-col items-center justify-center gap-6">
        {/* Loader estruturado com base no original */}
        <div className="text-center">
          <p className="text-xs font-black text-cyan-400 uppercase tracking-[0.2em] animate-pulse">
            MarkInPeace - IBPAZ
          </p>
          <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">
            A verificar sessão...
          </p>
        </div>
        <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-cyan-400 animate-[loading_1.5s_ease-in-out_infinite]"></div>
        </div>
        <style>{`
          @keyframes loading {
            0% { width: 0%; transform: translateX(-100%); }
            50% { width: 100%; transform: translateX(0%); }
            100% { width: 0%; transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  }

  return user ? <Dashboard user={user} onLogout={() => auth.signOut()} /> : <Auth onLoginSuccess={() => {}} />;
}

export default App;
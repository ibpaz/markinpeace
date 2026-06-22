import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#041d2c] w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-[#1e6091] transition-all">
        <div className="bg-[#1e6091] p-6 text-white flex justify-between items-center text-xs font-black uppercase tracking-widest">
          <h3>{title}</h3>
          <button onClick={onClose} className="text-2xl leading-none bg-transparent border-none text-white cursor-pointer">&times;</button>
        </div>
        <div className="p-8 max-h-[85vh] overflow-y-auto text-sm text-slate-200">
          {children}
        </div>
      </div>
    </div>
  );
};
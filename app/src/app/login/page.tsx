"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, Loader2, Sparkles, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
       alert("Email harus valid bro! 🛑");
       return;
    }
    
    setIsLoading(true);
    // Simulasi login 2 detik
    setTimeout(() => {
       setIsLoading(false);
       setIsSuccess(true);
       localStorage.setItem("cimeat_auth", JSON.stringify({ email, loggedIn: true }));
       
       setTimeout(() => {
          router.push("/");
       }, 800);
    }, 2000);
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-[#F8F7F4] font-sans overflow-hidden">
      
      {/* Top Banner */}
      <div className="relative h-2/5 w-full bg-orange overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-br from-orange to-[#FF8C61]" />
         <div className="absolute inset-0 opacity-10 flex items-center justify-center -rotate-12 scale-150">
            <Sparkles size={300} className="text-white" />
         </div>
         
         <div className="absolute bottom-10 left-10 text-white flex flex-col items-start gap-4">
            <div className="w-16 h-16 rounded-[2rem] bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/20">
               <UserCheck size={32} />
            </div>
            <div>
               <h1 className="text-4xl font-black tracking-tight leading-tight">Cimeat AI</h1>
               <p className="text-white/80 text-lg font-medium">Asisten Nutrisi Cerdas</p>
            </div>
         </div>
      </div>

      {/* Login Form */}
      <div className="relative -mt-8 flex-1 bg-white rounded-t-[3rem] p-10 shadow-2xl z-10 border-t border-white/50 flex flex-col justify-between">
         <div className="space-y-8">
            <div>
               <h2 className="text-2xl font-black text-[#1A1C1E] mb-2">Selamat Datang!</h2>
               <p className="text-[#8A8886] font-medium text-sm">Masuk ke akunmu untuk sinkronisasi data diet harian secara otomatis.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
               <div className="space-y-2">
                  <label className="text-[10px] text-[#8A8886] font-black uppercase tracking-widest pl-1">Email Anda</label>
                  <input 
                     className="w-full bg-[#F8F7F4] border-2 border-transparent focus:border-orange/20 focus:bg-white rounded-[1.8rem] px-6 py-4 outline-none transition-all placeholder:text-[#BDBDBD] font-bold"
                     type="email" 
                     placeholder="contoh@example.com"
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     disabled={isLoading || isSuccess}
                  />
               </div>

               <p className="text-[10px] text-[#BDBDBD] italic text-center leading-relaxed">
                  Dengan masuk, kamu menyetujui Kebijakan Privasi Cimeat 2026 yang menjaga data kesehatanmu tetap aman.
               </p>
            </form>
         </div>

         <div className="space-y-4">
            <button 
               onClick={handleLogin}
               disabled={isLoading || isSuccess}
               className={`w-full h-16 rounded-[2rem] font-black flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-xl shadow-orange/20 relative overflow-hidden
                 ${isSuccess ? 'bg-[#22C55E] text-white' : 'bg-orange text-white'}`}
            >
               {isLoading ? (
                  <Loader2 size={24} className="animate-spin" />
               ) : isSuccess ? (
                  <Check size={28} className="scale-110" />
               ) : (
                  <>Mulai Sekarang <ArrowRight size={20} /></>
               )}
            </button>
         </div>
      </div>

    </div>
  );
}

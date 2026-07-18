import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

export default function Login() {
  const { user, signInWithGithub, signInWithGoogle } = useAuth();

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex h-screen bg-paper-1 items-center justify-center font-body">
      <div className="bg-paper-2 p-10 rounded-[2.5rem] shadow-lg border border-border flex flex-col items-center max-w-md w-full">
        <h1 className="text-3xl font-bold font-display text-accent tracking-tight mb-2">
          Crypto<span className="text-ink-1">KOL</span>
        </h1>
        <p className="text-ink-3 mb-8 text-center">Sign in to manage your automated content generation platform.</p>
        
        <div className="flex flex-col gap-4 w-full">
          <button
            onClick={signInWithGithub}
            className="w-full flex items-center justify-center gap-3 bg-ink-1 text-white py-3 rounded-2xl font-bold hover:bg-ink-2 transition-colors"
          >
            Continue with GitHub
          </button>
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-border text-ink-1 py-3 rounded-2xl font-bold hover:bg-paper-1 transition-colors"
          >
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
}

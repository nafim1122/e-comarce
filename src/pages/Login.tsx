import React, { useState } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const mapError = (code: string) => {
    switch (code) {
      case 'auth/invalid-email': return 'Invalid email format';
      case 'auth/user-not-found': return 'No user with that email';
      case 'auth/wrong-password': return 'Wrong password';
      case 'auth/too-many-requests': return 'Too many attempts. Try later.';
      case 'auth/network-request-failed': return 'Network error. Check connection';
      default: return code.replace('auth/', '').replace(/-/g, ' ');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorText(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: 'Logged in' });
      navigate('/');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || 'auth/error';
      toast({ title: 'Login failed', description: mapError(code), variant: 'destructive' });
      setErrorText(mapError(code));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!email) {
      toast({ title: 'Enter your email first', variant: 'destructive' });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast({ title: 'Password reset email sent' });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || 'auth/error';
      toast({ title: 'Reset failed', description: mapError(code), variant: 'destructive' });
  setErrorText(mapError(code));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-xl shadow p-6 space-y-4">
        <h1 className="text-xl font-semibold text-center">Login</h1>
        <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required className="border rounded-md px-3 py-2 w-full text-sm" />
  <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required className="border rounded-md px-3 py-2 w-full text-sm" />
  {errorText && <div className="text-xs text-red-600">{errorText}</div>}
  <button disabled={loading} className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-md py-2 font-medium text-sm disabled:opacity-50">{loading ? 'Loading...' : 'Login'}</button>
  <button type="button" onClick={handleReset} className="w-full text-xs text-amber-600 hover:underline">Forgot password?</button>
        <p className="text-xs text-center text-gray-500">No account? <a href="/register" className="text-amber-600 hover:underline">Register</a></p>
      </form>
    </div>
  );
};
export default Login;

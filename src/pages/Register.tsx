import React, { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const mapError = (code: string) => {
    switch (code) {
      case 'auth/email-already-in-use': return 'Email already in use';
      case 'auth/invalid-email': return 'Invalid email';
      case 'auth/weak-password': return 'Weak password (min 6 chars)';
      case 'auth/network-request-failed': return 'Network error';
      default: return code.replace('auth/', '').replace(/-/g, ' ');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
  setErrorText(null);
    if (password.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      setLoading(false);
      return;
    }
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name) {
        await updateProfile(cred.user, { displayName: name });
      }
      toast({ title: 'Registered successfully' });
      navigate('/');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || 'auth/error';
      toast({ title: 'Registration failed', description: mapError(code), variant: 'destructive' });
  setErrorText(mapError(code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-xl shadow p-6 space-y-4">
        <h1 className="text-xl font-semibold text-center">Register</h1>
        <input type="text" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} className="border rounded-md px-3 py-2 w-full text-sm" />
        <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required className="border rounded-md px-3 py-2 w-full text-sm" />
  <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required className="border rounded-md px-3 py-2 w-full text-sm" />
  {errorText && <div className="text-xs text-red-600">{errorText}</div>}
        <button disabled={loading} className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-md py-2 font-medium text-sm disabled:opacity-50">{loading ? 'Loading...' : 'Register'}</button>
        <p className="text-xs text-center text-gray-500">Already have an account? <a href="/login" className="text-amber-600 hover:underline">Login</a></p>
      </form>
    </div>
  );
};
export default Register;

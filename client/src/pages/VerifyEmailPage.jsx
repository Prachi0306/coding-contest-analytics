import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const verifyEmailAction = useAuthStore(state => state.verifyEmail);

  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!email || !token) {
      setStatus('error');
      setMessage('Invalid verification link. Missing email or token.');
      return;
    }

    const verify = async () => {
      try {
        const res = await verifyEmailAction({ email, token });
        setStatus('success');
        setMessage(res.message || 'Email verified successfully! Redirecting to dashboard...');
        setTimeout(() => navigate('/dashboard'), 2000);
      } catch (err) {
        setStatus('error');
        setMessage(err.message || 'Verification failed. The link may have expired or is invalid.');
      }
    };

    verify();
  }, [email, token, navigate, verifyEmailAction]);

  return (
    <div className="page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center', padding: '40px 24px' }}>
        {status === 'loading' && (
          <>
            <div className="spinner" style={{ margin: '0 auto 24px' }} />
            <h2>Verifying your email...</h2>
            <p className="text-muted">Please wait while we verify your account.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✅</div>
            <h2>Verification Successful</h2>
            <p className="text-muted" style={{ marginBottom: '24px' }}>{message}</p>
            <Link to="/dashboard" className="btn btn--primary" style={{ width: '100%' }}>Go to Dashboard</Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>❌</div>
            <h2>Verification Failed</h2>
            <p className="text-muted" style={{ marginBottom: '24px' }}>{message}</p>
            <Link to="/register" className="btn btn--outline" style={{ width: '100%' }}>Return to Sign Up</Link>
          </>
        )}
      </div>
    </div>
  );
}

import { signIn, signOut, useSession } from 'next-auth/react';

export default function LoginButton() {
  const { data: session, status } = useSession();
  const loading = status === 'loading';

  if (loading) {
    return (
      <div className="login-button loading">
        <span>Loading...</span>
      </div>
    );
  }

  if (session) {
    return (
      <div className="login-button authenticated">
        <div className="user-info">
          {session.user.image && (
            <img src={session.user.image} alt={session.user.name} className="user-avatar" />
          )}
          <div className="user-details">
            <div className="user-name">{session.user.name}</div>
            <div className="user-email">{session.user.email}</div>
          </div>
        </div>
        <button onClick={() => signOut()} className="btn btn-secondary">
          Sign Out
        </button>

        <style jsx>{`
          .login-button {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 12px 16px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }

          .user-info {
            display: flex;
            align-items: center;
            gap: 12px;
            flex: 1;
          }

          .user-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 2px solid #e0e0e0;
          }

          .user-details {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }

          .user-name {
            font-weight: 600;
            color: #333;
            font-size: 14px;
          }

          .user-email {
            font-size: 12px;
            color: #666;
          }

          .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }

          .btn-secondary {
            background: #6c757d;
            color: white;
          }

          .btn-secondary:hover {
            background: #5a6268;
          }

          @media (max-width: 768px) {
            .login-button {
              flex-direction: column;
              align-items: stretch;
            }

            .user-info {
              padding-bottom: 12px;
              border-bottom: 1px solid #e0e0e0;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="login-button">
      <button onClick={() => signIn('google')} className="btn btn-google">
        <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Sign in with Google
      </button>

      <style jsx>{`
        .login-button {
          display: flex;
          justify-content: center;
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .btn-google {
          background: white;
          color: #333;
          border: 2px solid #e0e0e0;
        }

        .btn-google:hover {
          background: #f8f9fa;
          border-color: #4285F4;
        }

        .google-icon {
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}


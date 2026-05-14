import { useState } from 'react';
import { ClipboardList, LogIn } from 'lucide-react';
import { loginWithEmail } from '../../services/auth';
import chickLogin from '../../assets/chick-login.png';

function getAuthErrorMessage(error) {
  const code = error?.code || '';

  if (code === 'auth/email-already-in-use') return 'Este e-mail ja possui uma conta. Use Entrar no sistema.';
  if (code === 'auth/invalid-email') return 'Informe um e-mail valido.';
  if (code === 'auth/weak-password') return 'A senha precisa ter pelo menos 6 caracteres.';
  if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return 'E-mail ou senha incorretos.';
  }
  if (code === 'auth/network-request-failed') return 'Falha de rede ao falar com o Firebase. Verifique internet, bloqueio do navegador ou DNS.';
  if (code === 'auth/operation-not-allowed') return 'Login por e-mail/senha nao esta ativado no Firebase Authentication.';
  if (error?.message?.includes('demorou demais')) return error.message;

  return error?.message || 'Nao foi possivel autenticar.';
}

export default function AuthScreen() {
  const rememberedEmail = localStorage.getItem('capsRememberedEmail') || '';
  const [email, setEmail] = useState(rememberedEmail);
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(Boolean(rememberedEmail));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await loginWithEmail(email, password);
      if (rememberMe) {
        localStorage.setItem('capsRememberedEmail', email.trim());
      } else {
        localStorage.removeItem('capsRememberedEmail');
      }
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-stage">
        <section className="auth-card">
          <div className="auth-brand">
            <div className="auth-brand-icon">
              <ClipboardList size={24} />
            </div>
            <div>
              <p>CAPS AD</p>
              <span>Prontuario e producao</span>
            </div>
          </div>

          <h1>Entrar no sistema</h1>
          <p className="auth-copy">
            Acesse com e-mail e senha para salvar os dados no Firebase com seguranca por usuario.
          </p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <label>
              E-mail
              <input
                className="input"
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="usuario@email.com"
                required
              />
            </label>

            <label>
              Senha
              <input
                className="input"
                type="password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                placeholder="Minimo 6 caracteres"
                minLength={6}
                required
              />
            </label>

            <label className="auth-remember">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={event => setRememberMe(event.target.checked)}
              />
              <span>Lembrar de mim</span>
            </label>

            <button className="btn btn-primary" type="submit" disabled={loading}>
              <LogIn size={16} />
              {loading ? 'Aguarde...' : 'Entrar'}
            </button>
          </form>
        </section>

        <section className="auth-art" aria-hidden="true">
          <div className="auth-mandala">
            <span />
            <span />
            <span />
          </div>
          <div className="auth-art-badge">
            <img src={chickLogin} alt="" />
          </div>
        </section>
      </div>
    </main>
  );
}

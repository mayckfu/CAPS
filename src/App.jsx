import { useEffect, useState, lazy, Suspense } from 'react';
import AppShell from './components/layout/AppShell';
import AuthScreen from './components/auth/AuthScreen';
import { watchAuth } from './services/auth';
import { ensureDatabaseProfile, subscribeToProfile } from './services/db';

// Lazy load heavy views and modals
const CitizenSearch = lazy(() => import('./components/patients/CitizenSearch'));
const PatientForm = lazy(() => import('./components/patients/PatientForm'));
const RecordForm = lazy(() => import('./components/records/RecordForm'));
const PrintTemplate = lazy(() => import('./components/records/PrintTemplate'));
const ProfessionalList = lazy(() => import('./components/professionals/ProfessionalList'));
const ProfessionalForm = lazy(() => import('./components/professionals/ProfessionalForm'));
const UserProfileModal = lazy(() => import('./components/ui/UserProfileModal'));
const PrivacyModal = lazy(() => import('./components/auth/PrivacyModal'));
const HelpView = lazy(() => import('./components/ui/HelpView'));
const ReportsView = lazy(() => import('./components/records/ReportsView'));

const ViewLoader = () => (
  <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
    <p>Carregando ferramenta...</p>
  </div>
);

export default function App() {
  const [state, setState] = useState({ view: 'citizens' });
  const [printData, setPrint] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [searchContext, setSearchContext] = useState({ query: '', results: [], searched: false });
  const go = (view, extras = {}) => setState({ view, ...extras });

  useEffect(() => {
    let unsubProfile = null;
    const unsubscribeAuth = watchAuth(async currentUser => {
      setUser(currentUser);
      setAuthReady(true);
      
      if (currentUser) {
        // Garantir que perfil existe
        const prof = await ensureDatabaseProfile(currentUser);
        setProfile(prof);
        
        // Escutar mudanças no perfil (ex: role, mustChangePassword)
        if (unsubProfile) unsubProfile();
        unsubProfile = subscribeToProfile(currentUser.uid, (data) => {
          setProfile(data);
          if (data?.mustChangePassword) setShowProfile(true);
        });
      } else {
        setProfile(null);
        if (unsubProfile) unsubProfile();
        unsubProfile = null;
        setState({ view: 'citizens' });
      }
    });
    return () => {
      unsubscribeAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  function handlePrint(patient, record) {
    setPrint({ items: [{ patient, record }] });
    setTimeout(() => window.print(), 300);
  }

  function handlePrintBatch(items) {
    setPrint({ items });
    setTimeout(() => window.print(), 300);
  }

  if (!authReady) {
    return <div className="auth-loading">Carregando...</div>;
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <>
      <div id="print-frame">
        <Suspense fallback={null}>
          {printData?.items?.map((item, index) => (
            <PrintTemplate
              key={`${item.patient?.id || 'patient'}-${item.record?.id || index}`}
              patient={item.patient}
              record={item.record}
            />
          ))}
        </Suspense>
      </div>

      <div id="app-shell">
        {user && profile && !profile.acceptedTermsAt && (
          <Suspense fallback={null}>
            <PrivacyModal 
              profile={profile} 
              onAccept={() => {
                // O listener subscribeToProfile atualizará o estado automaticamente
              }} 
            />
          </Suspense>
        )}

        {showProfile && (
          <Suspense fallback={null}>
            <UserProfileModal 
              user={user} 
              profile={profile} 
              onClose={() => setShowProfile(false)} 
            />
          </Suspense>
        )}

        <AppShell 
          user={user} 
          profile={profile} 
          onOpenProfile={() => setShowProfile(true)} 
          onViewChange={v => go(v)} 
          currentView={state.view}
        >
          <Suspense fallback={<ViewLoader />}>
            {state.view === 'citizens' && (
              <CitizenSearch
                initialContext={searchContext}
                onSearchUpdate={setSearchContext}
                profile={profile}
                onNewPatient={() => go('patient-form')}
                onSelectPatient={p => go('patient-form', { patient: p })}
                onNewRecord={p => go('record-form', { patient: p })}
                onSelectRecord={(p, r) => go('record-form', { patient: p, record: r })}
                onOpenMedicalRecord={p => go('patient-form', { patient: p })}
                onPrint={handlePrint}
              />
            )}

            {state.view === 'patient-form' && (
              <PatientForm
                patient={state.patient}
                profile={profile}
                onBack={() => go('citizens')}
                onSaved={() => go('citizens')}
              />
            )}

            {state.view === 'record-form' && (
              <RecordForm
                patient={state.patient}
                record={state.record}
                profile={profile}
                onBack={() => go('citizens')}
                onSaved={saved => setState(prev => ({ ...prev, record: saved }))}
              />
            )}

            {state.view === 'professionals' && (
              <ProfessionalList 
                onNew={() => go('prof-form')} 
                onEdit={p => go('prof-form', { professional: p })}
              />
            )}

            {state.view === 'prof-form' && (
              <ProfessionalForm 
                professional={state.professional}
                onBack={() => go('professionals')}
                onSaved={() => go('professionals')}
              />
            )}

            {state.view === 'help' && <HelpView />}
            
            {state.view === 'reports' && <ReportsView onPrintBatch={handlePrintBatch} />}
          </Suspense>
        </AppShell>
      </div>
    </>
  );
}

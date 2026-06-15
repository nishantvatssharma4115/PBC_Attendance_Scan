import { useState, useEffect } from 'react';
import Header from './components/Header';
import Tabs from './components/Tabs';
import SetupPanel from './components/SetupPanel';
import ScanPanel from './components/ScanPanel';
import SessionsPanel from './components/SessionsPanel';
import MasterPanel from './components/MasterPanel';
import Toast from './components/Toast';
import { useSessions } from './hooks/useSessions';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState('scan');
  const [toast, setToast] = useState(null);
  
  const {
    sessions,
    activeSession,
    createSession,
    deleteSession,
    resumeSession,
    recordScan,
    syncStatus,
    deviceId
  } = useSessions();

  useEffect(() => {
    const handleSwitchTab = (e) => {
      setActiveTab(e.detail);
    };
    window.addEventListener('switchTab', handleSwitchTab);
    return () => window.removeEventListener('switchTab', handleSwitchTab);
  }, []);

  const showToast = (toastData) => {
    setToast(toastData);
    setTimeout(() => setToast(null), 2800);
  };

  return (
    <>
      <Header syncStatus={syncStatus} deviceId={deviceId} />
      
      {activeTab === 'setup' && (
        <SetupPanel 
          sessions={sessions}
          createSession={createSession}
          resumeSession={resumeSession}
        />
      )}
      
      {activeTab === 'scan' && (
        <ScanPanel 
          activeSession={activeSession}
          recordScan={recordScan}
          setToast={showToast}
        />
      )}
      
      {activeTab === 'sessions' && (
        <SessionsPanel 
          sessions={sessions}
          deleteSession={deleteSession}
          resumeSession={resumeSession}
        />
      )}
      
      {activeTab === 'master' && (
        <MasterPanel sessions={sessions} />
      )}
      
      <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <Toast toast={toast} />
    </>
  );
}

export default App;

export default function Tabs({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'setup', icon: '⚙️', label: 'Setup' },
    { id: 'scan', icon: '📷', label: 'Scan' },
    { id: 'sessions', icon: '📋', label: 'Sessions' },
    { id: 'master', icon: '📊', label: 'Master' },
  ];

  return (
    <nav className="tabs">
      {tabs.map(tab => (
        <button 
          key={tab.id}
          className={`tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
        >
          <span className="tab-icon">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

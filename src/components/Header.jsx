const syncStatusConfig = {
  synced: { label: "Synced", color: "#22c55e" },
  pending: { label: "Syncing...", color: "#eab308", blink: true },
  offline: { label: "Offline", color: "#ef4444" },
};

export default function Header({ syncStatus = "disabled" }) {
  const badge = syncStatusConfig[syncStatus];

  return (
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <div className="header-title">PBC 2026 · Attendance</div>
        <div className="header-sub">Policy BootCamp · 15 days · flexible sessions daily · 125 delegates</div>
      </div>
      {badge && (
        <div
          style={{
            color: badge.color,
            fontSize: "10px",
            fontWeight: 700,
            whiteSpace: "nowrap",
            animation: badge.blink ? "syncBadgeBlink 1.4s ease-in-out infinite" : "none",
          }}
        >
          ● {badge.label}
        </div>
      )}
      <style>{`
        @keyframes syncBadgeBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>
    </header>
  );
}

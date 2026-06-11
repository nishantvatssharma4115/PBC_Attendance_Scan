export default function Toast({ toast }) {
  if (!toast) return null;

  return (
    <div id="toast" className={`show ${toast.type === 'dup' ? 'toast-dup' : toast.type === 'error' ? 'toast-error' : ''}`}>
      <div className="toast-icon">{toast.icon}</div>
      <div className="toast-body">
        <div className="toast-title">{toast.title}</div>
        <div className="toast-sub">{toast.sub}</div>
      </div>
    </div>
  );
}

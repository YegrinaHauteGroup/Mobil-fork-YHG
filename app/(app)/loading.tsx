import "./reconnecting.css";

export default function AppLoading() {
  return (
    <div className="reconnect-screen">
      <span className="reconnect-spinner" aria-hidden="true" />
      <span className="reconnect-text">Reconnecting…</span>
    </div>
  );
}

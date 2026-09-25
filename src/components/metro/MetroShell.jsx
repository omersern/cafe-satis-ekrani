export default function MetroShell({ children }) {
  return (
    <div className="metro-win11-shell cafe-shell flex min-h-0 flex-1 flex-col">
      <div className="win11-metro-main metro-scroll flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

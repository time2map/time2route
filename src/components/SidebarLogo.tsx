import logo from '../assets/time2route-logo.svg';

export function SidebarLogo() {
  return (
    <div className="sidebar-logo">
      <img
        src={logo}
        alt="Time2Route logo"
        className="sidebar-logo-icon"
      />
      <span className="sidebar-brand">Time2Route</span>
    </div>
  );
}

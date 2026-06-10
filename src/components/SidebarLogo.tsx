import logoIcon from '../assets/time2Route.svg';

export function SidebarLogo() {
  return (
    <div className="sidebar-logo">
      <img
        src={logoIcon}
        alt="Time2Route logo"
        className="sidebar-logo-icon"
      />
    </div>
  );
}

import logoIcon from '../assets/LOGO-FIN.svg';

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

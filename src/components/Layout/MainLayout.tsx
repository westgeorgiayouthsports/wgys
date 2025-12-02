import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import './MainLayout.css';

export default function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="main-layout">
      <Sidebar onCollapse={setSidebarCollapsed} />
      <div className={`main-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <Header />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

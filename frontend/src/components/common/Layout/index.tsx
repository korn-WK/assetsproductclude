import React, { ReactNode } from 'react';
import styles from './Layout.module.css';

interface LayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children, sidebar }) => {
  return (
    <div className={styles.container}>
      {sidebar}
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
};

export default Layout; 
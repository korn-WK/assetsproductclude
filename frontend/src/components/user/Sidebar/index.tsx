import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AiFillHome, AiOutlineBarChart, AiOutlineFileText, AiOutlineClose } from 'react-icons/ai';
import styles from './Sidebar.module.css';
import { useAuth } from '../../../contexts/AuthContext';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const { user } = useAuth();
  return (
    <>
      {/* Overlay (mobile only) */}
      {open && <div className={styles.overlay} onClick={onClose} />}
      <aside className={open ? styles.sidebar + ' ' + styles.open : styles.sidebar}>
        <div className={styles.header}>
          <Image
            src="/mfu-logo.png" // ต้องมีไฟล์นี้ใน public/
            alt="Mae Fah Luang University Logo"
            width={40}
            height={40}
            className={styles.logo}
          />
          <span className={styles.universityName}>Mae Fah Luang University</span>
          {/* Close button (mobile only) */}
          <button className={styles.closeBtn} onClick={onClose}><AiOutlineClose /></button>
        </div>
        <nav className={styles.nav}>
          <ul>
            <li className={styles.navItem}>
              <Link href="/user/dashboard" className={styles.navLink + ' ' + styles.active}>
                  <AiOutlineBarChart className={styles.icon} />
                  <span>Dashboard</span>
              </Link>
            </li>
            <li className={styles.navItem}>
              <Link href="/user/asset-browser" className={styles.navLink}>
                  <AiFillHome className={styles.icon} />
                  <span>Assets</span>
              </Link>
            </li>
            {/* Asset Verification for Admin only */}
            {user?.role?.toLowerCase() === 'admin' && (
              <li className={styles.navItem}>
                <Link href="/user/asset-verification" className={styles.navLink}>
                  <AiOutlineFileText className={styles.icon} />
                  <span>Asset Verification</span>
                </Link>
              </li>
            )}
            <li className={styles.navItem}>
              <Link href="/user/reports" className={styles.navLink}>
                  <AiOutlineFileText className={styles.icon} />
                  <span>Reports</span>
              </Link>
            </li>
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
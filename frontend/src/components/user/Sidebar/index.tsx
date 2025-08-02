import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AiFillHome, AiOutlineBarChart, AiOutlineFileText, AiOutlineClose } from 'react-icons/ai';
import styles from './Sidebar.module.css';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'next/router';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const { user } = useAuth();
  const router = useRouter();
  const currentPath = router.pathname;
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
              <Link href="/user/asset-browser" className={styles.navLink + (currentPath === '/user/asset-browser' ? ' ' + styles.active : '')}>
                  <AiFillHome className={styles.icon} />
                  <span>Assets</span>
              </Link>
            </li>
            <li className={styles.navItem}>
              <Link href="/user/dashboard" className={styles.navLink + (currentPath === '/user/dashboard' ? ' ' + styles.active : '')}>
                  <AiOutlineBarChart className={styles.icon} />
                  <span>Dashboard</span>
              </Link>
            </li>
            {/* Asset Verification for Admin only */}
            {user?.originalRole?.toLowerCase() === 'admin' && (
              <>
              <li className={styles.navItem}>
                <Link href="/user/asset-verification" className={styles.navLink + (currentPath === '/user/asset-verification' ? ' ' + styles.active : '')}>
                  <AiOutlineFileText className={styles.icon} />
                  <span>Asset Verification</span>
                </Link>
              </li>
                <li className={styles.navItem}>
                  <Link href="/user/asset-transfer-verification" className={styles.navLink + (currentPath === '/user/asset-transfer-verification' ? ' ' + styles.active : '')}>
                    <AiOutlineFileText className={styles.icon} />
                    <span>Asset Transfer Verification</span>
                  </Link>
                </li>
                {/* Reports for Admin only */}
                {/* <li className={styles.navItem}>
                  <Link href="/user/reports" className={styles.navLink + (currentPath === '/user/reports' ? ' ' + styles.active : '')}>
                      <AiOutlineFileText className={styles.icon} />
                      <span>Reports</span>
                  </Link>
                </li> */}
              </>
            )}
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
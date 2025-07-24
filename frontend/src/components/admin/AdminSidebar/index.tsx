import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AiFillHome, AiOutlineBarChart, AiOutlineFileText, AiOutlineSetting, AiOutlineUser, AiOutlineTeam, AiOutlineDatabase, AiOutlineMenu, AiOutlineClose } from 'react-icons/ai';
import styles from './AdminSidebar.module.css';
import { useRouter } from 'next/router';

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ open, onClose }) => {
  // ปิด sidebar เมื่อคลิกเมนู (mobile)
  const handleNavClick = () => onClose();
  const router = useRouter();
  const currentPath = router.pathname;
  return (
    <>
      {/* Overlay (mobile only) */}
      {open && <div className={styles.overlay} onClick={onClose} />}
      <aside className={open ? styles.sidebar + ' ' + styles.open : styles.sidebar}>
        <div className={styles.header}>
          <Image
            src="/mfu-logo.png"
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
              <Link href="/admin/asset-management" className={styles.navLink + (currentPath === '/admin/asset-management' ? ' ' + styles.active : '')} onClick={handleNavClick}>
                  <AiOutlineSetting className={styles.icon} />
                  <span>Assets Management</span>
              </Link>
            </li>
            <li className={styles.navItem}>
              <Link href="/admin/dashboard" className={styles.navLink + (currentPath === '/admin/dashboard' ? ' ' + styles.active : '')} onClick={handleNavClick}>
                  <AiOutlineBarChart className={styles.icon} />
                  <span>Admin Dashboard</span>
              </Link>
            </li>
            <li className={styles.navItem}>
              <Link href="/admin/user-management" className={styles.navLink + (currentPath === '/admin/user-management' ? ' ' + styles.active : '')} onClick={handleNavClick}>
                  <AiOutlineUser className={styles.icon} />
                  <span>User Management</span>
              </Link>
            </li>
            <li className={styles.navItem}>
              <Link href="/admin/department-management" className={styles.navLink + (currentPath === '/admin/department-management' ? ' ' + styles.active : '')} onClick={handleNavClick}>
                  <AiOutlineTeam className={styles.icon} />
                  <span>Department Management</span>
              </Link>
            </li>
            <li className={styles.navItem}>
              <Link href="/admin/location-management" className={styles.navLink + (currentPath === '/admin/location-management' ? ' ' + styles.active : '')} onClick={handleNavClick}>
                  <AiOutlineDatabase className={styles.icon} />
                  <span>Location Management</span>
              </Link>
            </li>
            <li className={styles.navItem}>
              <Link href="/admin/status-management" className={styles.navLink + (currentPath === '/admin/status-management' ? ' ' + styles.active : '')} onClick={handleNavClick}>
                  <AiOutlineFileText className={styles.icon} />
                  <span>Status Management</span>
              </Link>
            </li>
            <li className={styles.navItem}>
              <Link href="/admin/asset-verification-all" className={styles.navLink + (currentPath === '/admin/asset-verification-all' ? ' ' + styles.active : '')} onClick={handleNavClick}>
                  <AiOutlineFileText className={styles.icon} />
                  <span>Asset Verification </span>
              </Link>
            </li>
            <li className={styles.navItem}>
              <Link href="/admin/asset-transfer-verification" className={styles.navLink + (currentPath === '/admin/asset-transfer-verification' ? ' ' + styles.active : '')} onClick={handleNavClick}>
                  <AiOutlineFileText className={styles.icon} />
                  <span>Asset Transfer Verification</span>
              </Link>
            </li>
            {/* <li className={styles.navItem}>
              <Link href="/admin/UserEditWindowSetting" className={styles.navLink + (currentPath === '/admin/UserEditWindowSetting' ? ' ' + styles.active : '')} onClick={handleNavClick}>
                  <AiOutlineFileText className={styles.icon} />
                  <span>UserEditWindowSetting</span>
              </Link>
            </li> */}
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default AdminSidebar; 
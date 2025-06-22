import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AiFillHome, AiOutlineFileText, AiOutlineSetting, AiOutlineUser, AiOutlineTeam, AiOutlineDatabase } from 'react-icons/ai';
import styles from './AdminSidebar.module.css';

const AdminSidebar: React.FC = () => {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <Image
          src="/mfu-logo.png"
          alt="Mae Fah Luang University Logo"
          width={40}
          height={40}
          className={styles.logo}
        />
        <span className={styles.universityName}>Mae Fah Luang University</span>
      </div>
      <nav className={styles.nav}>
        <ul>
          <li className={styles.navItem}>
            <Link href="/admin/dashboard" className={styles.navLink + ' ' + styles.active}>
                <AiFillHome className={styles.icon} />
                <span>Admin Dashboard</span>
            </Link>
          </li>
          <li className={styles.navItem}>
            <Link href="/admin/asset-management" className={styles.navLink}>
                <AiOutlineSetting className={styles.icon} />
                <span>Assets Management</span>
            </Link>
          </li>
          <li className={styles.navItem}>
            <Link href="/admin/user-management" className={styles.navLink}>
                <AiOutlineUser className={styles.icon} />
                <span>User Management</span>
            </Link>
          </li>
          <li className={styles.navItem}>
            <Link href="/admin/department-management" className={styles.navLink}>
                <AiOutlineTeam className={styles.icon} />
                <span>Department Management</span>
            </Link>
          </li>
          <li className={styles.navItem}>
            <Link href="/admin/location-management" className={styles.navLink}>
                <AiOutlineDatabase className={styles.icon} />
                <span>Location Management</span>
            </Link>
          </li>
          <li className={styles.navItem}>
            <Link href="/admin/reports" className={styles.navLink}>
                <AiOutlineFileText className={styles.icon} />
                <span>Admin Reports</span>
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default AdminSidebar; 
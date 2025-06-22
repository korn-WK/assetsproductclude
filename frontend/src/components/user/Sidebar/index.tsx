import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AiFillHome, AiOutlineBarChart, AiOutlineFileText } from 'react-icons/ai';
import styles from './Sidebar.module.css';

const Sidebar: React.FC = () => {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <Image
          src="/mfu-logo.png" // ต้องมีไฟล์นี้ใน public/
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
            <Link href="/user/asset-browser" className={styles.navLink + ' ' + styles.active}>
                <AiFillHome className={styles.icon} />
                <span>Assets</span>
            </Link>
          </li>
          <li className={styles.navItem}>
            <Link href="/user/dashboard" className={styles.navLink}>
                <AiOutlineBarChart className={styles.icon} />
                <span>Dashboard</span>
            </Link>
          </li>
          <li className={styles.navItem}>
            <Link href="/user/reports" className={styles.navLink}>
                <AiOutlineFileText className={styles.icon} />
                <span>Reports</span>
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
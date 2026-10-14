import { RolePermissions, User, UserRole } from '../types/index.ts';

const STORAGE_KEY_USERS = 'ph_users_registry_v1';
const STORAGE_KEY_CURRENT_USER = 'ph_current_user_v1';

export const INITIAL_USERS: User[] = [
  {
    id: 'USR-001',
    username: 'admin',
    fullName: 'นพ. วิทยา วรเดชสกุล',
    email: 'witthaya.health@gov.th',
    role: 'admin',
    roleTitle: 'ผู้อำนวยการกองสาธารณสุขและสิ่งแวดล้อม (Admin)',
    department: 'กองสาธารณสุขและสิ่งแวดล้อม',
    phone: '081-999-8877',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'USR-002',
    username: 'inspector',
    fullName: 'น.ส. พิมลภัส ศรีสุข',
    email: 'pimonpat.sanitation@gov.th',
    role: 'inspector',
    roleTitle: 'นักวิชาการสาธารณสุขชำนาญการ (Inspector)',
    department: 'กลุ่มงานสุขาภิบาลและอนามัยสิ่งแวดล้อม',
    phone: '086-444-3322',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-01-05T09:00:00Z',
  },
  {
    id: 'USR-003',
    username: 'staff',
    fullName: 'นายกิตติกร อัครเดช',
    email: 'kittikorn.service@gov.th',
    role: 'staff',
    roleTitle: 'เจ้าพนักงานสาธารณสุขชุมชน (Staff)',
    department: 'กลุ่มงานบริการสาธารณสุขและ LTC',
    phone: '089-777-6655',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-02-10T10:00:00Z',
  },
  {
    id: 'USR-004',
    username: 'citizen',
    fullName: 'นายสมชาย รัตนโชติสกุล (ครัวริมน้ำ)',
    email: 'somchai.user@gmail.com',
    role: 'citizen',
    roleTitle: 'ผู้ประกอบการ / ประชาชนทั่วไป (General User)',
    department: 'ผู้ประกอบการในพื้นที่',
    phone: '081-456-7890',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-03-01T11:00:00Z',
  },
];

export function getRolePermissions(role: UserRole): RolePermissions {
  switch (role) {
    case 'admin':
      return {
        canView: true,
        canEdit: true,
        canDelete: true,
        canInspect: true,
        canPrintCert: true,
        canApprove: true,
        canManageUsers: true,
      };
    case 'inspector':
      return {
        canView: true,
        canEdit: true,
        canDelete: false,
        canInspect: true,
        canPrintCert: true,
        canApprove: false,
        canManageUsers: false,
      };
    case 'staff':
      return {
        canView: true,
        canEdit: true,
        canDelete: false,
        canInspect: false,
        canPrintCert: true,
        canApprove: false,
        canManageUsers: false,
      };
    case 'citizen':
    default:
      return {
        canView: true,
        canEdit: false,
        canDelete: false,
        canInspect: false,
        canPrintCert: true,
        canApprove: false,
        canManageUsers: false,
      };
  }
}

export function getAllUsers(): User[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error loading users:', e);
  }
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(INITIAL_USERS));
  return INITIAL_USERS;
}

export function getCurrentUser(): User {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error loading current user:', e);
  }
  // Default to admin for immediate convenience, but full auth switcher is available
  const defaultUser = INITIAL_USERS[0];
  localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(defaultUser));
  return defaultUser;
}

export function setCurrentUser(user: User): void {
  localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
}

export function logoutUser(): void {
  localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
}

export function registerUser(newUser: Omit<User, 'id' | 'createdAt'>): { success: boolean; message: string; user?: User } {
  const users = getAllUsers();
  const exists = users.find(
    (u) => u.username.toLowerCase() === newUser.username.toLowerCase() || u.email.toLowerCase() === newUser.email.toLowerCase()
  );

  if (exists) {
    return { success: false, message: 'ชื่อผู้ใช้ (Username) หรืออีเมลนี้มีอยู่ในระบบแล้ว' };
  }

  const roleTitleMap: Record<UserRole, string> = {
    admin: 'ผู้อำนวยการ / ผู้ดูแลระบบ',
    inspector: 'นักวิชาการสาธารณสุข / ผู้ตรวจ',
    staff: 'เจ้าหน้าที่ธุรการและบริการ',
    citizen: 'ผู้ประกอบการ / ประชาชน',
  };

  const createdUser: User = {
    ...newUser,
    id: `USR-${Date.now().toString().slice(-4)}`,
    roleTitle: roleTitleMap[newUser.role] || newUser.role,
    createdAt: new Date().toISOString(),
  };

  const updatedUsers = [...users, createdUser];
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updatedUsers));
  setCurrentUser(createdUser);

  return { success: true, message: 'ลงทะเบียนเข้าสู่ระบบสำเร็จ', user: createdUser };
}

export function loginUser(usernameOrEmail: string, _password?: string): { success: boolean; message: string; user?: User } {
  const users = getAllUsers();
  const trimmed = usernameOrEmail.trim().toLowerCase();
  const found = users.find(
    (u) => u.username.toLowerCase() === trimmed || u.email.toLowerCase() === trimmed
  );

  if (!found) {
    return { success: false, message: 'ไม่พบชื่อผู้ใช้หรืออีเมลนี้ในระบบ' };
  }

  setCurrentUser(found);
  return { success: true, message: 'เข้าสู่ระบบสำเร็จ', user: found };
}

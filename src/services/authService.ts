import { RolePermissions, User, UserRole } from '../types/index.ts';

const STORAGE_KEY_USERS = 'ph_users_registry_v1';
const STORAGE_KEY_CURRENT_USER = 'ph_current_user_v1';

export const INITIAL_USERS: User[] = [
  {
    id: 'USR-001',
    username: 'anas.inspector',
    fullName: 'พันจ่าเอกอานัส เด่นหมาด',
    email: 'anas.inspector@bangpao.go.th',
    role: 'inspector',
    roleTitle: 'เจ้าพนักงานสาธารณสุขชำนาญงาน (นายตรวจ)',
    department: 'กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า',
    phone: '081-370-1841',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'USR-002',
    username: 'admin',
    fullName: 'นางสาวปฐมาภรณ์ จันทร์แจ่ม',
    email: 'pathamaporn.health@bangpao.go.th',
    role: 'admin',
    roleTitle: 'ผู้อำนวยการกองสาธารณสุขและสิ่งแวดล้อม',
    department: 'กองสาธารณสุขและสิ่งแวดล้อม ทต.บางเป้า',
    phone: '075-270569',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'USR-003',
    username: 'executive',
    fullName: 'นายนิติธรรม ดำสุด',
    email: 'nititham.mayor@bangpao.go.th',
    role: 'executive',
    roleTitle: 'รองนายกเทศมนตรี ปฏิบัติราชการแทนนายกเทศมนตรี',
    department: 'สำนักเทศบาลตำบลบางเป้า',
    phone: '075-270569',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'USR-004',
    username: 'staff',
    fullName: 'นายชนะ สุขด้วง',
    email: 'chana.driver@bangpao.go.th',
    role: 'staff',
    roleTitle: 'พนักงานขับรถบรรทุกสิ่งปฏิกูล / พนักงานพัสดุ (Staff)',
    department: 'งานบริการสาธารณะและสิ่งปฏิกูล',
    phone: '089-777-6655',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-02-10T10:00:00Z',
  },
  {
    id: 'USR-005',
    username: 'citizen',
    fullName: 'นางสำรอง วัฒนา (หจก.บุญโชคบริการ)',
    email: 'samrong.user@gmail.com',
    role: 'citizen',
    roleTitle: 'ผู้ประกอบการ / ประชาชนตำบลบางเป้า (Citizen)',
    department: '99/1 หมู่ 2 ต.บางเป้า อ.กันตัง จ.ตรัง',
    phone: '081-370-1841',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
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
    case 'executive':
      return {
        canView: true,
        canEdit: true,
        canDelete: false,
        canInspect: true,
        canPrintCert: true,
        canApprove: true,
        canManageUsers: false,
      };
    case 'inspector':
      return {
        canView: true,
        canEdit: true,
        canDelete: true,
        canInspect: true,
        canPrintCert: true,
        canApprove: true,
        canManageUsers: true,
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
      const parsed = JSON.parse(raw);
      if (parsed && parsed.fullName && !parsed.fullName.includes('พิมลภัส')) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading current user:', e);
  }
  // Default to พันจ่าเอกอานัส เด่นหมาด
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
    executive: 'ผู้บริหารเทศบาลตำบลบางเป้า',
    inspector: 'เจ้าพนักงานสาธารณสุข / นายตรวจ',
    staff: 'เจ้าหน้าที่ธุรการและบริการ',
    citizen: 'ผู้ประกอบการ / ประชาชน',
  };

  const createdUser: User = {
    ...newUser,
    id: `USR-${Date.now().toString().slice(-4)}`,
    roleTitle: newUser.roleTitle || roleTitleMap[newUser.role] || newUser.role,
    createdAt: new Date().toISOString(),
  };

  const updatedUsers = [...users, createdUser];
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updatedUsers));

  return { success: true, message: 'บันทึกข้อมูลบุคลากรใหม่สำเร็จ', user: createdUser };
}

export function updateUser(updated: User): { success: boolean; message: string; user?: User } {
  const users = getAllUsers();
  const idx = users.findIndex((u) => u.id === updated.id);
  if (idx < 0) {
    return { success: false, message: 'ไม่พบข้อมูลบุคลากรที่ต้องการแก้ไข' };
  }
  const updatedList = [...users];
  updatedList[idx] = { ...updated };
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updatedList));

  // If editing current user, sync current user storage
  const current = getCurrentUser();
  if (current.id === updated.id) {
    setCurrentUser(updated);
  }

  return { success: true, message: `อัปเดตข้อมูล ${updated.fullName} เรียบร้อยแล้ว`, user: updated };
}

export function deleteUser(userId: string): { success: boolean; message: string } {
  const users = getAllUsers();
  const target = users.find((u) => u.id === userId);
  if (!target) {
    return { success: false, message: 'ไม่พบบุคลากรที่ต้องการลบ' };
  }
  const current = getCurrentUser();
  if (current.id === userId) {
    return { success: false, message: 'ไม่สามารถลบบัญชีผู้ใช้งานที่กำลังล็อกอินอยู่ได้' };
  }
  const remaining = users.filter((u) => u.id !== userId);
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(remaining));
  return { success: true, message: `ลบบุคลากร ${target.fullName} ออกจากระบบเรียบร้อยแล้ว` };
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

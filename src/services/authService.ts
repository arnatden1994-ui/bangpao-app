import { RolePermissions, User, UserRole } from '../types/index.ts';

const STORAGE_KEY_USERS = 'ph_users_registry_v3';
const STORAGE_KEY_SESSION = 'ph_active_session_v3';

export const INITIAL_USERS: User[] = [
  {
    id: 'USR-001',
    username: 'anas.inspector',
    password: '1234',
    fullName: 'พันจ่าเอกอานัส เด่นหมาด',
    email: 'anas.inspector@bangpao.go.th',
    role: 'inspector',
    roleTitle: 'เจ้าพนักงานสาธารณสุขชำนาญงาน (นายตรวจ)',
    department: 'กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า',
    phone: '081-370-1841',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-01-01T08:00:00Z',
    status: 'active',
  },
  {
    id: 'USR-002',
    username: 'admin',
    password: '1234',
    fullName: 'นางสาวปฐมาภรณ์ จันทร์แจ่ม',
    email: 'pathamaporn.health@bangpao.go.th',
    role: 'admin',
    roleTitle: 'ผู้อำนวยการกองสาธารณสุขและสิ่งแวดล้อม',
    department: 'กองสาธารณสุขและสิ่งแวดล้อม ทต.บางเป้า',
    phone: '075-270569',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-01-01T08:00:00Z',
    status: 'active',
  },
  {
    id: 'USR-003',
    username: 'executive',
    password: '1234',
    fullName: 'นายนิติธรรม ดำสุด',
    email: 'nititham.mayor@bangpao.go.th',
    role: 'executive',
    roleTitle: 'รองนายกเทศมนตรี ปฏิบัติราชการแทนนายกเทศมนตรี',
    department: 'สำนักเทศบาลตำบลบางเป้า',
    phone: '075-270569',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-01-01T08:00:00Z',
    status: 'active',
  },
  {
    id: 'USR-004',
    username: 'staff',
    password: '1234',
    fullName: 'นายชนะ สุขด้วง',
    email: 'chana.driver@bangpao.go.th',
    role: 'staff',
    roleTitle: 'พนักงานขับรถบรรทุกสิ่งปฏิกูล / พนักงานพัสดุ (Staff)',
    department: 'งานบริการสาธารณะและสิ่งปฏิกูล',
    phone: '089-777-6655',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-02-10T10:00:00Z',
    status: 'active',
  },
  {
    id: 'USR-005',
    username: 'citizen',
    password: '1234',
    fullName: 'นางสำรอง วัฒนา (หจก.บุญโชคบริการ)',
    email: 'samrong.user@gmail.com',
    role: 'citizen',
    roleTitle: 'ผู้ประกอบการ / ประชาชนตำบลบางเป้า (Citizen)',
    department: '99/1 หมู่ 2 ต.บางเป้า อ.กันตัง จ.ตรัง',
    phone: '081-370-1841',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-03-01T11:00:00Z',
    status: 'active',
  },
  {
    id: 'USR-006',
    username: 'somchai.staff',
    password: '1234',
    fullName: 'นายสมชาย พิทักษ์ไทย',
    email: 'somchai@bangpao.go.th',
    role: 'staff',
    roleTitle: 'เจ้าหน้าที่สาธารณสุขใหม่ (รออนุมัติ)',
    department: 'กองสาธารณสุขและสิ่งแวดล้อม',
    phone: '082-111-2233',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-10-25T09:00:00Z',
    status: 'pending',
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

/**
 * ดึงเซสชันที่กำลังล็อกอินอยู่จริง (ถ้าไม่มีจะส่งกลับ null ทำให้ขึ้นหน้า Login)
 */
export function getActiveSession(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSION);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id && parsed.username) {
        // ตรวจสอบว่าผู้ใช้ยังมีอยู่ในระบบและยังไม่ถูกระงับ
        const users = getAllUsers();
        const found = users.find((u) => u.id === parsed.id);
        if (found) {
          if (found.status === 'suspended') return null;
          return found;
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading session:', e);
  }
  return null;
}

export function setActiveSession(user: User | null): void {
  if (user) {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY_SESSION);
  }
}

export function getCurrentUser(): User {
  const session = getActiveSession();
  if (session) return session;
  return INITIAL_USERS[0];
}

export function setCurrentUser(user: User): void {
  setActiveSession(user);
}

export function logoutUser(): void {
  setActiveSession(null);
}

export function loginUser(
  usernameOrEmail: string,
  password?: string
): { success: boolean; message: string; user?: User } {
  const users = getAllUsers();
  const trimmed = usernameOrEmail.trim().toLowerCase();

  const found = users.find(
    (u) => u.username.toLowerCase() === trimmed || u.email.toLowerCase() === trimmed
  );

  if (!found) {
    return { success: false, message: 'ไม่พบชื่อผู้ใช้หรืออีเมลนี้ในระบบ' };
  }

  // ตรวจสอบรหัสผ่าน (ค่าเริ่มต้น 1234 หรือที่กำหนดไว้)
  const expectedPassword = found.password || '1234';
  if (password !== undefined && password !== '' && password !== expectedPassword) {
    return { success: false, message: 'รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' };
  }

  // ตรวจสอบสถานะบัญชี (ระบบยืนยันโดยแอดมิน)
  if (found.status === 'pending') {
    return {
      success: false,
      message: 'บัญชีนี้อยู่ระหว่างรอผู้ดูแลระบบ (Admin) ตรวจสอบและยืนยันการให้สิทธิ์เข้าใช้งาน',
    };
  }

  if (found.status === 'suspended') {
    return {
      success: false,
      message: 'บัญชีนี้ถูกระงับสิทธิ์การใช้งานชั่วคราว กรุณาติดต่อผู้อำนวยการกองสาธารณสุข',
    };
  }

  setActiveSession(found);
  return { success: true, message: `เข้าสู่ระบบสำเร็จ ยินดีต้อนรับ ${found.fullName}`, user: found };
}

export function approveUser(
  userId: string,
  role?: UserRole,
  roleTitle?: string
): { success: boolean; message: string; user?: User } {
  const users = getAllUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) return { success: false, message: 'ไม่พบบัญชีผู้ใช้ที่ต้องการอนุมัติ' };

  const target = users[idx];
  const updatedUser: User = {
    ...target,
    status: 'active',
    role: role || target.role,
    roleTitle: roleTitle || target.roleTitle,
  };

  users[idx] = updatedUser;
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));

  return {
    success: true,
    message: `ยืนยันและอนุมัติบัญชีของ "${updatedUser.fullName}" เรียบร้อยแล้ว สามารถเข้าใช้งานระบบได้ทันที`,
    user: updatedUser,
  };
}

export function toggleUserStatus(
  userId: string,
  newStatus: 'active' | 'pending' | 'suspended'
): { success: boolean; message: string; user?: User } {
  const users = getAllUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) return { success: false, message: 'ไม่พบบัญชีผู้ใช้' };

  users[idx] = { ...users[idx], status: newStatus };
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));

  const statusLabel = newStatus === 'active' ? 'เปิดใช้งาน' : newStatus === 'pending' ? 'รออนุมัติ' : 'ระงับสิทธิ์';
  return {
    success: true,
    message: `เปลี่ยนสถานะบัญชีของ "${users[idx].fullName}" เป็น "${statusLabel}" สำเร็จ`,
    user: users[idx],
  };
}

export function changeUserPassword(
  userId: string,
  newPassword: string
): { success: boolean; message: string } {
  if (!newPassword || newPassword.length < 3) {
    return { success: false, message: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 3 ตัวอักษร' };
  }
  const users = getAllUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) return { success: false, message: 'ไม่พบบัญชีผู้ใช้' };

  users[idx] = { ...users[idx], password: newPassword };
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));

  const session = getActiveSession();
  if (session && session.id === userId) {
    setActiveSession({ ...session, password: newPassword });
  }

  return { success: true, message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว' };
}

export function registerUser(
  newUser: Omit<User, 'id' | 'createdAt'> & { requestedByAdmin?: boolean }
): { success: boolean; message: string; user?: User } {
  const users = getAllUsers();
  const exists = users.find(
    (u) =>
      u.username.toLowerCase() === newUser.username.toLowerCase() ||
      (newUser.email && u.email && u.email.toLowerCase() === newUser.email.toLowerCase())
  );

  if (exists) {
    return { success: false, message: `ชื่อผู้ใช้ "${newUser.username}" หรืออีเมลนี้มีอยู่ในระบบแล้ว กรุณาเลือกชื่ออื่น` };
  }

  const roleTitleMap: Record<UserRole, string> = {
    admin: 'ผู้อำนวยการกองสาธารณสุข / ผู้ดูแลระบบ',
    executive: 'ผู้บริหารเทศบาลตำบลบางเป้า',
    inspector: 'เจ้าพนักงานสาธารณสุข / นายตรวจ',
    staff: 'เจ้าหน้าที่ผู้ปฏิบัติงาน (Staff)',
    citizen: 'ประชาชนตำบลบางเป้า / ผู้รับบริการ',
  };

  const isCreatedByAdmin = newUser.requestedByAdmin === true;

  const createdUser: User = {
    ...newUser,
    id: `USR-${Date.now().toString().slice(-4)}`,
    password: newUser.password || '1234',
    roleTitle: newUser.roleTitle || roleTitleMap[newUser.role] || newUser.role,
    createdAt: new Date().toISOString(),
    status: isCreatedByAdmin ? 'active' : (newUser.status || 'pending'),
  };

  const updatedUsers = [...users, createdUser];
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updatedUsers));

  const message = isCreatedByAdmin
    ? `เพิ่มบัญชีเจ้าหน้าที่ "${createdUser.fullName}" เรียบร้อยแล้ว (Username: ${createdUser.username})`
    : `ส่งคำขอเปิดบัญชีสำเร็จ! (Username: ${createdUser.username}) กรุณาแจ้ง ผอ.กองสาธารณสุข เพื่อยืนยันสิทธิ์เปิดใช้งาน`;

  return { success: true, message, user: createdUser };
}

export function updateUser(updated: User): { success: boolean; message: string; user?: User } {
  const users = getAllUsers();
  const idx = users.findIndex((u) => u.id === updated.id);
  if (idx < 0) {
    return { success: false, message: 'ไม่พบข้อมูลบุคลากรที่ต้องการแก้ไข' };
  }

  // ป้องกัน Username ซ้ำกับเจ้าหน้าที่คนอื่น
  if (updated.username) {
    const trimmedUsername = updated.username.trim().toLowerCase();
    const dup = users.find(
      (u) => u.id !== updated.id && u.username.toLowerCase() === trimmedUsername
    );
    if (dup) {
      return {
        success: false,
        message: `ชื่อผู้ใช้งาน (Username) "${updated.username}" มีผู้อื่นใช้งานแล้ว กรุณาเลือกชื่ออื่น`,
      };
    }
  }

  const updatedList = [...users];
  updatedList[idx] = { ...updated };
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updatedList));

  const session = getActiveSession();
  if (session && session.id === updated.id) {
    setActiveSession(updated);
  }

  return { success: true, message: `อัปเดตข้อมูล ${updated.fullName} เรียบร้อยแล้ว`, user: updated };
}

export function deleteUser(userId: string): { success: boolean; message: string } {
  const users = getAllUsers();
  const target = users.find((u) => u.id === userId);
  if (!target) {
    return { success: false, message: 'ไม่พบบุคลากรที่ต้องการลบ' };
  }
  const session = getActiveSession();
  if (session && session.id === userId) {
    return { success: false, message: 'ไม่สามารถลบบัญชีผู้ใช้งานที่กำลังล็อกอินอยู่ได้' };
  }
  const remaining = users.filter((u) => u.id !== userId);
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(remaining));
  return { success: true, message: `ลบบุคลากร ${target.fullName} ออกจากระบบเรียบร้อยแล้ว` };
}

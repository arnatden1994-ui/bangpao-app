import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Edit3,
  Trash2,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  SlidersHorizontal,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Printer,
  Download,
  Calendar,
  Layers,
  ChevronDown,
  X,
  TrendingUp,
  FileSpreadsheet,
  Check,
  RefreshCw,
  Info,
  Clock,
  Boxes,
  ShieldCheck,
  CheckSquare,
  HelpCircle,
} from 'lucide-react';
import { LtcPatient, LtcRoundItem } from '../types/index.ts';

export interface LtcInventoryItem {
  id: string;
  code: string;
  name: string;
  specification: string;
  totalStock: number;
  allocatedStock: number;
  remainingStock: number;
  unit: string;
  monthlyRequirement: number;
  lotNo: string;
  expireDate: string;
  status: 'sufficient' | 'low' | 'critical';
  category?: 'diaper' | 'nutrition' | 'underpad' | 'equipment' | 'other';
  minStockAlert?: number;
  location?: string;
  unitPrice?: number;
}

export interface StockTransactionLog {
  id: string;
  dateStr: string;
  itemName: string;
  itemCode?: string;
  type: 'in' | 'out' | 'adjust';
  quantity: number;
  recipientOrSource?: string;
  reason?: string;
  balanceAfter?: number;
}

interface LtcInventoryManagerProps {
  inventory: LtcInventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<LtcInventoryItem[]>>;
  stockLogs: StockTransactionLog[];
  setStockLogs: React.Dispatch<React.SetStateAction<StockTransactionLog[]>>;
  patients: LtcPatient[];
  userRole?: string;
  onShowToast?: (msg: string) => void;
}

// Helper: Format Thai Date & Time
export function formatThaiDateTime(date: Date = new Date()): string {
  const thMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  const d = date.getDate();
  const m = thMonths[date.getMonth()];
  const y = (date.getFullYear() + 543).toString().slice(-2);
  const hh = date.getHours().toString().padStart(2, '0');
  const mm = date.getMinutes().toString().padStart(2, '0');
  return `${d} ${m} ${y} ${hh}:${mm} น.`;
}

// หมวดหมู่พัสดุ
export const INVENTORY_CATEGORIES = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'diaper', label: 'ผ้าอ้อมผู้ใหญ่' },
  { id: 'nutrition', label: 'โภชนาการ / นม' },
  { id: 'underpad', label: 'แผ่นรองซับ' },
  { id: 'equipment', label: 'กายอุปกรณ์ / อื่นๆ' },
];

export const LtcInventoryManager: React.FC<LtcInventoryManagerProps> = ({
  inventory,
  setInventory,
  stockLogs,
  setStockLogs,
  patients,
  userRole,
  onShowToast,
}) => {
  // Navigation View: 'inventory' | 'forecast' | 'history'
  const [activeView, setActiveView] = useState<'inventory' | 'forecast' | 'history'>('inventory');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'normal' | 'low'>('all');

  // Modals
  const [editingItem, setEditingItem] = useState<LtcInventoryItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<LtcInventoryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<LtcInventoryItem | null>(null);

  // Form for In-take (Smart Restock Form on the right side)
  const [quickRestockItemId, setQuickRestockItemId] = useState<string>('');
  const [quickRestockQty, setQuickRestockQty] = useState<string>('');
  const [quickRestockLot, setQuickRestockLot] = useState<string>('');
  const [quickRestockSource, setQuickRestockSource] = useState<string>('จัดสรรงบ สปสช. ประจำงวด');

  // Quick Stock Adjustment Form
  const [adjustType, setAdjustType] = useState<'in' | 'out' | 'count' | 'damaged'>('count');
  const [adjustQty, setAdjustQty] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<string>('ตรวจนับสต็อกจริงประจำงวด');

  // In-app Alert / Toast
  const [alertNotice, setAlertNotice] = useState<string | null>(null);
  const showNotice = (msg: string) => {
    setAlertNotice(msg);
    if (onShowToast) onShowToast(msg);
    setTimeout(() => setAlertNotice(null), 4000);
  };

  // Helper: Detect category of an item
  const getItemCategory = (item: LtcInventoryItem): string => {
    if (item.category) return item.category;
    const n = item.name.toLowerCase();
    if (n.includes('ผ้าอ้อม')) return 'diaper';
    if (n.includes('นม')) return 'nutrition';
    if (n.includes('แผ่นรองซับ') || n.includes('underpad')) return 'underpad';
    return 'equipment';
  };

  // Helper: Stock Health Status
  const getStockHealth = (item: LtcInventoryItem) => {
    const minAlert = item.minStockAlert ?? (item.totalStock > 0 ? Math.round(item.totalStock * 0.15) : 50);
    const rem = item.remainingStock;
    if (rem <= 0) return { label: 'สต็อกหมด', color: 'bg-rose-500 text-white', badge: 'วิกฤต', isLow: true };
    if (rem <= minAlert) return { label: 'สต็อกเริ่มต่ำ', color: 'bg-amber-500 text-white', badge: 'เริ่มเหลือน้อย', isLow: true };
    return { label: 'สต็อกปกติ', color: 'bg-emerald-600 text-white', badge: 'พร้อมแจก', isLow: false };
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const totalItems = inventory.length;
    const totalRemainingUnits = inventory.reduce((acc, i) => acc + (i.remainingStock || 0), 0);
    let lowCount = 0;
    let normalCount = 0;

    inventory.forEach((it) => {
      const h = getStockHealth(it);
      if (h.isLow) lowCount++;
      else normalCount++;
    });

    // Total dispensed from logs
    const totalOut = stockLogs.filter((l) => l.type === 'out').reduce((acc, l) => acc + Math.abs(l.quantity), 0);

    return { totalItems, totalRemainingUnits, lowCount, normalCount, totalOut };
  }, [inventory, stockLogs]);

  // Filtered Inventory List
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.specification.toLowerCase().includes(searchQuery.toLowerCase());

      const itemCat = getItemCategory(item);
      const matchesCategory = selectedCategory === 'all' || itemCat === selectedCategory;

      const health = getStockHealth(item);
      const matchesStatus =
        selectedStatusFilter === 'all' ||
        (selectedStatusFilter === 'normal' && !health.isLow) ||
        (selectedStatusFilter === 'low' && health.isLow);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [inventory, searchQuery, selectedCategory, selectedStatusFilter]);

  // LTC Demand Analysis (Supply vs Demand from 14 registered patients)
  const demandAnalysis = useMemo(() => {
    const demandPerRound: Record<string, { name: string; needed: number; unit: string; patientCount: number }> = {
      'ผ้าอ้อมผู้ใหญ่ (M)': { name: 'ผ้าอ้อมผู้ใหญ่ (M)', needed: 0, unit: 'ชิ้น', patientCount: 0 },
      'ผ้าอ้อมผู้ใหญ่ (L)': { name: 'ผ้าอ้อมผู้ใหญ่ (L)', needed: 0, unit: 'ชิ้น', patientCount: 0 },
      'ผ้าอ้อมผู้ใหญ่ (XL)': { name: 'ผ้าอ้อมผู้ใหญ่ (XL)', needed: 0, unit: 'ชิ้น', patientCount: 0 },
      'ผ้าอ้อมผู้ใหญ่ (XXL)': { name: 'ผ้าอ้อมผู้ใหญ่ (XXL)', needed: 0, unit: 'ชิ้น', patientCount: 0 },
      'นมผงสุขภาพ': { name: 'นมผงสุขภาพ', needed: 0, unit: 'กระป๋อง', patientCount: 0 },
      'แผ่นรองซับสิ่งขับถ่าย (Underpads)': { name: 'แผ่นรองซับสิ่งขับถ่าย (Underpads)', needed: 0, unit: 'แผ่น', patientCount: 0 },
    };

    patients.forEach((p) => {
      const items: LtcRoundItem[] =
        p.yearRoundItems?.['2569']?.['1'] ||
        p.roundItems?.['1'] ||
        p.roundItems?.['2'] ||
        [];

      items.forEach((it) => {
        let key = it.itemName;
        if (key.includes('(M)')) key = 'ผ้าอ้อมผู้ใหญ่ (M)';
        else if (key.includes('(L)')) key = 'ผ้าอ้อมผู้ใหญ่ (L)';
        else if (key.includes('(XL)')) key = 'ผ้าอ้อมผู้ใหญ่ (XL)';
        else if (key.includes('(XXL)') || key.includes('(2XL)')) key = 'ผ้าอ้อมผู้ใหญ่ (XXL)';
        else if (key.includes('นมผง')) key = 'นมผงสุขภาพ';
        else if (key.includes('แผ่นรองซับ')) key = 'แผ่นรองซับสิ่งขับถ่าย (Underpads)';

        if (!demandPerRound[key]) {
          demandPerRound[key] = { name: key, needed: 0, unit: it.unit || 'ชิ้น', patientCount: 0 };
        }
        demandPerRound[key].needed += it.quantity || 0;
        demandPerRound[key].patientCount += 1;
      });
    });

    return inventory.map((inv) => {
      let matchedKey = inv.name;
      if (matchedKey.includes('(2XL)')) matchedKey = 'ผ้าอ้อมผู้ใหญ่ (XXL)';
      const demand = demandPerRound[matchedKey] || { needed: 0, unit: inv.unit, patientCount: 0 };
      const roundsRemaining = demand.needed > 0 ? (inv.remainingStock / demand.needed).toFixed(1) : '∞';
      const daysRemaining = demand.needed > 0 ? Math.round((inv.remainingStock / demand.needed) * 90) : '∞';

      let riskLevel: 'safe' | 'warning' | 'critical' = 'safe';
      const numRounds = parseFloat(roundsRemaining);
      if (!isNaN(numRounds)) {
        if (numRounds < 1.0) riskLevel = 'critical';
        else if (numRounds <= 2.5) riskLevel = 'warning';
      }

      return {
        item: inv,
        demandPerRound: demand.needed,
        patientCount: demand.patientCount,
        roundsRemaining,
        daysRemaining,
        riskLevel,
      };
    });
  }, [inventory, patients]);

  // ===================== CRUD ACTIONS =====================

  // 1. Save Edited Item
  const handleSaveEditItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setInventory((prev) =>
      prev.map((it) => (it.id === editingItem.id ? editingItem : it))
    );
    showNotice(`✓ แก้ไขข้อมูลพัสดุ "${editingItem.name}" เรียบร้อยแล้ว`);
    setEditingItem(null);
  };

  // 2. Add New Item
  const handleCreateNewItem = (newItem: Omit<LtcInventoryItem, 'id'>) => {
    const id = `INV-LTC-${Date.now().toString().slice(-4)}`;
    const fullItem: LtcInventoryItem = {
      ...newItem,
      id,
    };
    setInventory((prev) => [...prev, fullItem]);

    // Add log
    if (newItem.remainingStock > 0) {
      const newLog: StockTransactionLog = {
        id: `LOG-${Date.now()}`,
        dateStr: formatThaiDateTime(),
        itemName: newItem.name,
        itemCode: newItem.code,
        type: 'in',
        quantity: newItem.remainingStock,
        recipientOrSource: 'ตั้งต้นเปิดสต็อกใหม่',
        reason: 'เพิ่มรายการพัสดุใหม่ในคลัง',
        balanceAfter: newItem.remainingStock,
      };
      setStockLogs((prev) => [newLog, ...prev.slice(0, 49)]);
    }

    showNotice(`✓ เพิ่มพัสดุใหม่ "${newItem.name}" ในคลังเรียบร้อยแล้ว`);
    setIsAddModalOpen(false);
  };

  // 3. Confirm Delete Item
  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    setInventory((prev) => prev.filter((it) => it.id !== itemToDelete.id));
    showNotice(`🗑️ ลบพัสดุ "${itemToDelete.name}" ออกจากคลังเรียบร้อยแล้ว`);
    setItemToDelete(null);
  };

  // 4. Quick Stock Adjustment
  const handleSaveStockAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem) return;

    const val = parseInt(adjustQty, 10);
    if (isNaN(val) || val < 0) {
      alert('กรุณากรอกตัวเลขจำนวนที่ถูกต้อง');
      return;
    }

    let newRemaining = adjustingItem.remainingStock;
    let logType: 'in' | 'out' | 'adjust' = 'adjust';
    let delta = 0;

    if (adjustType === 'in') {
      newRemaining = adjustingItem.remainingStock + val;
      logType = 'in';
      delta = val;
    } else if (adjustType === 'out' || adjustType === 'damaged') {
      newRemaining = Math.max(0, adjustingItem.remainingStock - val);
      logType = 'out';
      delta = -val;
    } else if (adjustType === 'count') {
      delta = val - adjustingItem.remainingStock;
      newRemaining = val;
      logType = delta >= 0 ? 'in' : 'out';
    }

    // Update item
    setInventory((prev) =>
      prev.map((it) => {
        if (it.id === adjustingItem.id) {
          return {
            ...it,
            remainingStock: newRemaining,
            totalStock: Math.max(it.totalStock, newRemaining),
            status: newRemaining > (it.minStockAlert || 50) ? 'sufficient' : 'low',
          };
        }
        return it;
      })
    );

    // Add log
    const newLog: StockTransactionLog = {
      id: `LOG-${Date.now()}`,
      dateStr: formatThaiDateTime(),
      itemName: adjustingItem.name,
      itemCode: adjustingItem.code,
      type: logType,
      quantity: delta,
      recipientOrSource: adjustType === 'damaged' ? 'ตัดยอดชำรุด' : 'ปรับยอดสต็อก',
      reason: adjustReason || 'ปรับยอดสต็อกประจำงวด',
      balanceAfter: newRemaining,
    };
    setStockLogs((prev) => [newLog, ...prev.slice(0, 49)]);

    showNotice(`✓ ปรับยอดสต็อก "${adjustingItem.name}" เป็น ${newRemaining} ${adjustingItem.unit} เรียบร้อยแล้ว`);
    setAdjustingItem(null);
    setAdjustQty('');
    setAdjustReason('ตรวจนับสต็อกจริงประจำงวด');
  };

  // 5. Smart Quick Restock Submit
  const handleQuickRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetItem = inventory.find((i) => i.id === quickRestockItemId);
    const qty = parseInt(quickRestockQty, 10);
    if (!targetItem || isNaN(qty) || qty <= 0) return;

    setInventory((prev) =>
      prev.map((it) => {
        if (it.id === targetItem.id) {
          const updatedRemaining = it.remainingStock + qty;
          return {
            ...it,
            totalStock: it.totalStock + qty,
            remainingStock: updatedRemaining,
            lotNo: quickRestockLot.trim() || it.lotNo,
            status: 'sufficient',
          };
        }
        return it;
      })
    );

    const newLog: StockTransactionLog = {
      id: `LOG-${Date.now()}`,
      dateStr: formatThaiDateTime(),
      itemName: targetItem.name,
      itemCode: targetItem.code,
      type: 'in',
      quantity: qty,
      recipientOrSource: quickRestockSource.trim() || 'จัดสรรงบ สปสช.',
      reason: `รับเข้าคลัง (${quickRestockLot ? `Lot: ${quickRestockLot}` : 'ตามแผนงาน'})`,
      balanceAfter: targetItem.remainingStock + qty,
    };
    setStockLogs((prev) => [newLog, ...prev.slice(0, 49)]);

    showNotice(`✅ บันทึกรับ "${targetItem.name}" เข้าคลัง +${qty} ${targetItem.unit} เรียบร้อยแล้ว`);
    setQuickRestockQty('');
    setQuickRestockLot('');
  };

  // ===================== EXPORTS & PRINT =====================

  // 1. Export CSV
  const handleExportCSV = () => {
    const headers = ['รหัส', 'รายการพัสดุ', 'หมวดหมู่', 'คุณลักษณะ/สเปก', 'คงเหลือ', 'ยอดรับเข้ารวม', 'หน่วย', 'สถานะ', 'เกณฑ์เตือนสต็อกต่ำ', 'Lot No', 'วันหมดอายุ'];
    const rows = inventory.map((it) => [
      `"${it.code}"`,
      `"${it.name}"`,
      `"${getItemCategory(it)}"`,
      `"${it.specification.replace(/"/g, '""')}"`,
      it.remainingStock,
      it.totalStock,
      `"${it.unit}"`,
      `"${getStockHealth(it).label}"`,
      it.minStockAlert ?? 50,
      `"${it.lotNo || '-'}"`,
      `"${it.expireDate || '-'}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `รายงานคลังพัสดุ_LTC_เทศบาลตำบลบางเป้า_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showNotice('📥 ดาวน์โหลดไฟล์รายงาน CSV เรียบร้อยแล้ว');
  };

  // 2. Print Stock Audit Sheet (ใบตรวจนับสต็อกพัสดุ A4)
  const handlePrintAuditSheet = () => {
    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!printWindow) {
      alert('กรุณาอนุญาต Pop-up เพื่อพิมพ์ใบตรวจนับสต็อก');
      return;
    }

    const rowsHtml = inventory
      .map(
        (it, idx) => `
        <tr style="height: 32pt;">
          <td style="border: 1px solid #000; padding: 4pt; text-align: center;">${idx + 1}</td>
          <td style="border: 1px solid #000; padding: 4pt; text-align: center; font-weight: bold;">${it.code}</td>
          <td style="border: 1px solid #000; padding: 4pt 6pt;">
            <div style="font-weight: bold;">${it.name}</div>
            <div style="font-size: 13pt; color: #555;">${it.specification}</div>
          </td>
          <td style="border: 1px solid #000; padding: 4pt; text-align: center; font-weight: bold; font-size: 16pt;">
            ${it.remainingStock.toLocaleString()}
          </td>
          <td style="border: 1px solid #000; padding: 4pt; text-align: center;">${it.unit}</td>
          <td style="border: 1px solid #000; padding: 4pt; text-align: center; background-color: #fafafa;">&nbsp;</td>
          <td style="border: 1px solid #000; padding: 4pt; text-align: center; background-color: #fafafa;">&nbsp;</td>
          <td style="border: 1px solid #000; padding: 4pt 6pt; font-size: 13pt;">${it.lotNo || '-'}</td>
        </tr>
      `
      )
      .join('');

    const html = `<!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="utf-8">
      <title>ใบตรวจนับพัสดุและคลังอุปกรณ์ LTC - เทศบาลตำบลบางเป้า</title>
      <style>
        @page { size: A4 portrait; margin: 15mm 15mm 15mm 15mm; }
        body { font-family: 'TH SarabunPSK', 'Sarabun', sans-serif; font-size: 15pt; line-height: 1.2; color: #000; margin: 0; padding: 0; }
        table { width: 100%; border-collapse: collapse; border: 1px solid #000; }
        th { border: 1px solid #000; padding: 5pt; background-color: #f2f2f2; font-weight: bold; text-align: center; }
        td { border: 1px solid #000; padding: 4pt; }
        .header { text-align: center; margin-bottom: 12pt; }
        .signatures { margin-top: 25pt; display: flex; justify-content: space-between; }
        .sig-box { width: 45%; text-align: center; font-size: 14pt; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2 style="margin: 0; font-size: 18pt; font-weight: bold;">แบบรายงานการตรวจนับพัสดุ/อุปกรณ์คงคลัง ประจำงวด</h2>
        <h3 style="margin: 2pt 0; font-size: 16pt;">กองทุนหลักประกันสุขภาพและระบบการดูแลระยะยาว (LTC) เทศบาลตำบลบางเป้า</h3>
        <p style="margin: 0; font-size: 14pt; color: #333;">วันที่พิมพ์ตรวจนับ: ${formatThaiDateTime()} • รวมทั้งสิ้น ${inventory.length} รายการ</p>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 5%;">ลำดับ</th>
            <th style="width: 8%;">รหัส</th>
            <th style="width: 32%;">ชื่อพัสดุ / คุณลักษณะ</th>
            <th style="width: 12%;">ยอดในระบบ</th>
            <th style="width: 8%;">หน่วย</th>
            <th style="width: 13%;">ยอดตรวจนับจริง</th>
            <th style="width: 10%;">ผลต่าง (+/-)</th>
            <th style="width: 12%;">หมายเหตุ / Lot</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="signatures" style="margin-top: 30pt; display: flex; justify-content: space-between;">
        <div style="width: 45%; text-align: center;">
          <p style="margin-bottom: 35pt;">ลงชื่อ......................................................... ผู้ตรวจนับ<br>(.........................................................)<br>ตำแหน่ง .........................................................</p>
          <p>วันที่ ......./......./............</p>
        </div>
        <div style="width: 45%; text-align: center;">
          <p style="margin-bottom: 35pt;">ลงชื่อ......................................................... พยาน/ผู้รับผิดชอบคลัง<br>(.........................................................)<br>ตำแหน่ง .........................................................</p>
          <p>วันที่ ......./......./............</p>
        </div>
      </div>
    </body>
    </html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 300);
    };
  };

  return (
    <div className="space-y-4 font-sans text-slate-800">
      {/* Toast Notification */}
      {alertNotice && (
        <div className="p-3 bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-between shadow-md animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{alertNotice}</span>
          </div>
          <button
            onClick={() => setAlertNotice(null)}
            className="text-white hover:text-emerald-100 text-xs font-bold px-2 py-0.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* TOP HEADER & ACTION BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-extrabold text-slate-900">
                ระบบบริหารคลังพัสดุ & อุปกรณ์ LTC
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                กองทุน สปสช. ทต.บางเป้า
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              จัดการรายการพัสดุ ปรับสต็อก รับเข้า-เบิกจ่าย และวิเคราะห์ความพอเพียงผ้าอ้อม/นมสำหรับผู้มีภาวะพึ่งพิง 14 ราย
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ เพิ่มพัสดุรายการใหม่</span>
          </button>
          <button
            type="button"
            onClick={handlePrintAuditSheet}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            title="พิมพ์แบบตรวจนับสต็อก A4 สำหรับเจ้าหน้าที่เดินนับ"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์ใบตรวจนับ A4</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            title="ส่งออกรายการพัสดุเป็นไฟล์ Excel/CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>ส่งออก CSV</span>
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Items */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500">พัสดุทั้งหมด</div>
            <div className="text-lg sm:text-xl font-extrabold text-slate-900">
              {stats.totalItems}{' '}
              <span className="text-xs font-normal text-slate-500">รายการ</span>
            </div>
            <div className="text-[10px] text-slate-400">
              คงเหลือรวม {stats.totalRemainingUnits.toLocaleString()} หน่วย
            </div>
          </div>
        </div>

        {/* Card 2: Normal Stock */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500">สต็อกปกติ (พร้อมแจก)</div>
            <div className="text-lg sm:text-xl font-extrabold text-emerald-700">
              {stats.normalCount}{' '}
              <span className="text-xs font-normal text-slate-500">รายการ</span>
            </div>
            <div className="text-[10px] text-emerald-600">ปริมาณเพียงพอตามเกณฑ์</div>
          </div>
        </div>

        {/* Card 3: Low Stock Warning */}
        <div
          onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'low' ? 'all' : 'low')}
          className={`p-3.5 sm:p-4 rounded-2xl border shadow-xs flex items-center gap-3 cursor-pointer transition-all ${
            stats.lowCount > 0
              ? 'bg-amber-50/70 border-amber-300 hover:bg-amber-100/70'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-amber-900">สต็อกเหลือน้อย / ต้องเติม</div>
            <div className="text-lg sm:text-xl font-extrabold text-amber-700">
              {stats.lowCount}{' '}
              <span className="text-xs font-normal text-slate-500">รายการ</span>
            </div>
            <div className="text-[10px] text-amber-800">
              {stats.lowCount > 0 ? 'คลิกเพื่อกรองดูรายการ' : 'ไม่มีรายการขาดแคลน'}
            </div>
          </div>
        </div>

        {/* Card 4: Accumulated Dispensed */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500">จ่ายออกสะสม</div>
            <div className="text-lg sm:text-xl font-extrabold text-purple-700">
              {stats.totalOut.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-500">หน่วย</span>
            </div>
            <div className="text-[10px] text-purple-600">ตามแผนการดูแล LTC</div>
          </div>
        </div>
      </div>

      {/* VIEW SELECTOR TABS */}
      <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs font-bold w-fit">
        <button
          type="button"
          onClick={() => setActiveView('inventory')}
          className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
            activeView === 'inventory'
              ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>ตารางคลังพัสดุ & รับเข้า</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('forecast')}
          className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
            activeView === 'forecast'
              ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>วิเคราะห์ความพอเพียงเทียบผู้ป่วย LTC (14 ราย)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('history')}
          className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
            activeView === 'history'
              ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>ประวัติการเข้า-ออกคลังทั้งหมด ({stockLogs.length})</span>
        </button>
      </div>

      {/* ===================== VIEW 1: INVENTORY & RESTOCK ===================== */}
      {activeView === 'inventory' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN: Inventory Table (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            {/* Search & Category Filter Toolbar */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อพัสดุ, รหัส หรือสเปก..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {selectedStatusFilter !== 'all' && (
                  <button
                    onClick={() => setSelectedStatusFilter('all')}
                    className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-bold hover:bg-slate-200"
                  >
                    ล้างตัวกรองสถานะ ✕
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {INVENTORY_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Inventory Table with Edit & Action Buttons */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-slate-800 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3 w-14 text-center">รหัส</th>
                      <th className="py-3 px-3">รายการพัสดุ</th>
                      <th className="py-3 px-3 text-right">คงเหลือ</th>
                      <th className="py-3 px-3 text-center">หน่วย</th>
                      <th className="py-3 px-3 text-center">สถานะ</th>
                      <th className="py-3 px-3 text-center w-28">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInventory.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          ไม่พบรายการพัสดุที่ตรงกับเงื่อนไขการค้นหา
                        </td>
                      </tr>
                    ) : (
                      filteredInventory.map((item, idx) => {
                        const health = getStockHealth(item);
                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-slate-50/80 transition-colors group"
                          >
                            {/* Code */}
                            <td className="py-3 px-3 text-center font-bold text-slate-600">
                              <span className="px-2 py-0.5 bg-slate-100 rounded-md">
                                {item.code || idx + 1}
                              </span>
                            </td>

                            {/* Name & Specification */}
                            <td className="py-3 px-3">
                              <div className="font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                                {item.name}
                              </div>
                              {item.specification && (
                                <div className="text-[11px] text-slate-500 line-clamp-1">
                                  {item.specification}
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                                {item.lotNo && <span>Lot: {item.lotNo}</span>}
                                {item.expireDate && <span>หมดอายุ: {item.expireDate}</span>}
                              </div>
                            </td>

                            {/* Remaining Stock */}
                            <td className="py-3 px-3 text-right">
                              <div className="font-extrabold text-slate-900 text-sm sm:text-base">
                                {item.remainingStock.toLocaleString()}
                              </div>
                              {item.totalStock > item.remainingStock && (
                                <div className="text-[10px] text-slate-400">
                                  รับเข้ารวม {item.totalStock.toLocaleString()}
                                </div>
                              )}
                            </td>

                            {/* Unit */}
                            <td className="py-3 px-3 text-center font-medium text-slate-600">
                              {item.unit}
                            </td>

                            {/* Status Badge */}
                            <td className="py-3 px-3 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  health.isLow
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                }`}
                              >
                                {health.badge}
                              </span>
                            </td>

                            {/* Actions: Edit, Adjust, Delete */}
                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {/* Quick Stock Adjustment */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAdjustingItem(item);
                                    setAdjustQty(String(item.remainingStock));
                                  }}
                                  className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                                  title="ปรับยอดสต็อกด่วน (+ / -)"
                                >
                                  <SlidersHorizontal className="w-3.5 h-3.5" />
                                </button>

                                {/* Edit Item Full Details */}
                                <button
                                  type="button"
                                  onClick={() => setEditingItem({ ...item })}
                                  className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg transition-colors cursor-pointer"
                                  title="แก้ไขข้อมูลพัสดุ (ชื่อ, รหัส, สเปก, หน่วย)"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>

                                {/* Delete Item */}
                                <button
                                  type="button"
                                  onClick={() => setItemToDelete(item)}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                                  title="ลบรายการพัสดุนี้"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Smart In-take Form + Recent Logs (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Top Right Card: Smart Restock Form */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                    <ArrowDownLeft className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm sm:text-base font-extrabold text-slate-900">
                    รับพัสดุเข้าคลัง (เติมสต็อก)
                  </h4>
                </div>
                <span className="text-[11px] text-slate-400 font-bold">
                  งวดปัจจุบัน
                </span>
              </div>

              <form onSubmit={handleQuickRestockSubmit} className="space-y-3 text-xs sm:text-sm">
                {/* Select Item to restock */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    เลือกรายการพัสดุที่ต้องการเติมสต็อก *
                  </label>
                  <select
                    value={quickRestockItemId}
                    onChange={(e) => setQuickRestockItemId(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none font-semibold text-slate-800"
                  >
                    <option value="">-- คลิกเพื่อเลือกพัสดุในคลัง --</option>
                    {inventory.map((it) => (
                      <option key={it.id} value={it.id}>
                        [{it.code}] {it.name} (คงเหลือปัจจุบัน: {it.remainingStock.toLocaleString()} {it.unit})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity + Quick Preset Buttons */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700">
                      จำนวนที่รับเข้า *
                    </label>
                    <div className="flex items-center gap-1">
                      {[50, 100, 300, 500, 1000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setQuickRestockQty(String(preset))}
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 transition-colors cursor-pointer"
                        >
                          +{preset}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="number"
                    min={1}
                    required
                    placeholder="ระบุจำนวนตัวเลข"
                    value={quickRestockQty}
                    onChange={(e) => setQuickRestockQty(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold text-slate-900"
                  />
                </div>

                {/* Lot No. & Source */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      หมายเลข Lot No.
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น LOT-69-02"
                      value={quickRestockLot}
                      onChange={(e) => setQuickRestockLot(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      แหล่งที่มา / งบประมาณ
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น สปสช. งวด 1"
                      value={quickRestockSource}
                      onChange={(e) => setQuickRestockSource(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!quickRestockItemId || !quickRestockQty}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>บันทึกรับพัสดุเข้าคลัง</span>
                </button>
              </form>
            </div>

            {/* Bottom Right Card: Recent Transactions (10 Latest) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-slate-500" />
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                    ประวัติเข้า-ออกคลัง (ล่าสุด)
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveView('history')}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-bold"
                >
                  ดูทั้งหมด ({stockLogs.length}) →
                </button>
              </div>

              <div className="overflow-x-auto max-h-72 overflow-y-auto divide-y divide-slate-100">
                {stockLogs.slice(0, 10).map((log) => (
                  <div
                    key={log.id}
                    className="py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50 px-1 rounded-lg"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            log.type === 'in' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        <span>{log.itemName}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2">
                        <span>{log.dateStr}</span>
                        {log.reason && <span>• {log.reason}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-extrabold text-xs ${
                          log.type === 'in'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {log.type === 'in' && log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== VIEW 2: LTC DEMAND FORECAST ===================== */}
      {activeView === 'forecast' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-slate-900">
                วิเคราะห์ความพอเพียงของสต็อกเทียบกับแผนแจกจ่ายจริง (ผู้ป่วย LTC 14 ราย)
              </h4>
              <p className="text-xs text-slate-500">
                ระบบคำนวณอัตโนมัติจากความต้องการผ้าอ้อมและนมตามแผนการดูแลรายบุคคล (Care Plan) เพื่อให้วางแผนจัดซื้อจัดจ้างได้ทันท่วงที
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {demandAnalysis.map(({ item, demandPerRound, patientCount, roundsRemaining, daysRemaining, riskLevel }) => (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all ${
                  riskLevel === 'critical'
                    ? 'bg-rose-50/50 border-rose-300'
                    : riskLevel === 'warning'
                    ? 'bg-amber-50/50 border-amber-300'
                    : 'bg-slate-50/70 border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      รหัส {item.code}
                    </span>
                    <h5 className="font-extrabold text-slate-900 text-sm">{item.name}</h5>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      riskLevel === 'critical'
                        ? 'bg-rose-600 text-white'
                        : riskLevel === 'warning'
                        ? 'bg-amber-500 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {riskLevel === 'critical'
                      ? 'ใกล้หมด'
                      : riskLevel === 'warning'
                      ? 'ควรจัดหาเพิ่ม'
                      : 'สต็อกพอเพียง'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 my-3">
                  <div className="flex justify-between">
                    <span>สต็อกคงเหลือในคลัง:</span>
                    <strong className="text-slate-900 font-extrabold">
                      {item.remainingStock.toLocaleString()} {item.unit}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>ผู้ป่วยที่ต้องการใช้:</span>
                    <span className="font-bold text-slate-800">{patientCount} ราย</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ปริมาณที่ต้องใช้ต่อรอบ:</span>
                    <span className="font-bold text-blue-700">
                      {demandPerRound.toLocaleString()} {item.unit} / รอบ
                    </span>
                  </div>
                </div>

                {/* Progress Visual Bar */}
                <div className="pt-2 border-t border-slate-200/80">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-slate-700">ประมาณการความพอเพียง:</span>
                    <span className="font-extrabold text-emerald-700">
                      พอจ่ายได้อีก ~{roundsRemaining} รอบ ({daysRemaining} วัน)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        riskLevel === 'critical'
                          ? 'bg-rose-500'
                          : riskLevel === 'warning'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(5, (parseFloat(roundsRemaining) / 4) * 100 || 50)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================== VIEW 3: FULL TRANSACTION HISTORY ===================== */}
      {activeView === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <RotateCcw className="w-5 h-5 text-emerald-600" />
              <div>
                <h4 className="text-base font-extrabold text-slate-900">
                  ประวัติการเคลื่อนไหวคลังทั้งหมด (Stock Transaction Logs)
                </h4>
                <p className="text-xs text-slate-500">
                  บันทึกการรับเข้า จ่ายออก และปรับยอดสต็อกทุกรายการแบบเรียลไทม์
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              ส่งออกประวัติ
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">วัน / เวลา</th>
                  <th className="py-3 px-3">รายการพัสดุ</th>
                  <th className="py-3 px-3 text-center">ประเภท</th>
                  <th className="py-3 px-3 text-right">จำนวน</th>
                  <th className="py-3 px-3 text-right">ยอดคงเหลือหลังทำรายการ</th>
                  <th className="py-3 px-3">ผู้รับ / แหล่งที่มา / เหตุผล</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-3 text-slate-600 font-medium whitespace-nowrap">
                      {log.dateStr}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-800">
                      {log.itemName}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white ${
                          log.type === 'in' ? 'bg-emerald-600' : 'bg-rose-600'
                        }`}
                      >
                        {log.type === 'in' ? 'รับเข้า' : 'จ่ายออก'}
                      </span>
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-extrabold ${
                        log.type === 'in' ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {log.type === 'in' && log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-700">
                      {log.balanceAfter !== undefined ? log.balanceAfter.toLocaleString() : '-'}
                    </td>
                    <td className="py-3 px-3 text-slate-600 text-xs">
                      {log.recipientOrSource || log.reason || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== MODAL 1: EDIT ITEM MODAL ===================== */}
      {editingItem && (
        <div className="fixed inset-0 z-[130] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-400" />
                <h4 className="font-extrabold text-base">แก้ไขข้อมูลพัสดุในคลัง</h4>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditItem} className="p-5 space-y-3.5 text-xs sm:text-sm">
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    รหัสพัสดุ *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.code}
                    onChange={(e) => setEditingItem({ ...editingItem, code: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ชื่อพัสดุ / อุปกรณ์ *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  คุณลักษณะ / รายละเอียดสเปก
                </label>
                <textarea
                  rows={2}
                  value={editingItem.specification}
                  onChange={(e) => setEditingItem({ ...editingItem, specification: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    จำนวนคงเหลือปัจจุบัน *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={editingItem.remainingStock}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        remainingStock: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-extrabold text-emerald-800 text-base"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    หน่วยนับ *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.unit}
                    onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    หมายเลข Lot No.
                  </label>
                  <input
                    type="text"
                    value={editingItem.lotNo || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, lotNo: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    วันหมดอายุ (วว/ดด/ปปปป)
                  </label>
                  <input
                    type="date"
                    value={editingItem.expireDate || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, expireDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL 2: QUICK ADJUSTMENT MODAL ===================== */}
      {adjustingItem && (
        <div className="fixed inset-0 z-[130] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="px-5 py-4 bg-blue-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-blue-300" />
                <h4 className="font-extrabold text-base">ปรับยอดสต็อกด่วน</h4>
              </div>
              <button
                type="button"
                onClick={() => setAdjustingItem(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStockAdjustment} className="p-5 space-y-4 text-xs sm:text-sm">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-500 font-medium">รายการพัสดุ:</div>
                <div className="text-sm font-extrabold text-slate-900">
                  [{adjustingItem.code}] {adjustingItem.name}
                </div>
                <div className="text-xs text-emerald-700 mt-1">
                  ยอดคงเหลือปัจจุบัน:{' '}
                  <strong>
                    {adjustingItem.remainingStock.toLocaleString()} {adjustingItem.unit}
                  </strong>
                </div>
              </div>

              {/* Adjust Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ประเภทการปรับยอด:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustType('count');
                      setAdjustQty(String(adjustingItem.remainingStock));
                    }}
                    className={`p-2 rounded-xl border font-bold text-xs flex items-center gap-1.5 ${
                      adjustType === 'count'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span>🔍 ตรวจนับสต็อกจริง</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAdjustType('in');
                      setAdjustQty('');
                    }}
                    className={`p-2 rounded-xl border font-bold text-xs flex items-center gap-1.5 ${
                      adjustType === 'in'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span>📥 รับเข้าเพิ่ม (+)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAdjustType('out');
                      setAdjustQty('');
                    }}
                    className={`p-2 rounded-xl border font-bold text-xs flex items-center gap-1.5 ${
                      adjustType === 'out'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span>📤 เบิกจ่ายพิเศษ (-)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAdjustType('damaged');
                      setAdjustQty('');
                    }}
                    className={`p-2 rounded-xl border font-bold text-xs flex items-center gap-1.5 ${
                      adjustType === 'damaged'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span>⚠️ ตัดยอดชำรุด/หมดอายุ</span>
                  </button>
                </div>
              </div>

              {/* Input Value */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {adjustType === 'count'
                    ? `ยอดที่ตรวจนับได้จริง (${adjustingItem.unit}) *`
                    : `จำนวนที่ต้องการปรับ (${adjustingItem.unit}) *`}
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-extrabold text-base text-slate-900"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  เหตุผล / หมายเหตุอ้างอิง *
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAdjustingItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs"
                >
                  ยืนยันปรับยอด
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL 3: ADD NEW ITEM MODAL ===================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[130] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="px-5 py-4 bg-emerald-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-300" />
                <h4 className="font-extrabold text-base">เพิ่มรายการพัสดุใหม่ในคลัง</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleCreateNewItem({
                  code: (formData.get('code') as string) || String(inventory.length + 1),
                  name: (formData.get('name') as string) || '',
                  specification: (formData.get('specification') as string) || '',
                  totalStock: parseInt(formData.get('remainingStock') as string, 10) || 0,
                  allocatedStock: 0,
                  remainingStock: parseInt(formData.get('remainingStock') as string, 10) || 0,
                  unit: (formData.get('unit') as string) || 'ชิ้น',
                  monthlyRequirement: 0,
                  lotNo: (formData.get('lotNo') as string) || '',
                  expireDate: (formData.get('expireDate') as string) || '',
                  status: 'sufficient',
                  category: (formData.get('category') as any) || 'equipment',
                });
              }}
              className="p-5 space-y-3.5 text-xs sm:text-sm"
            >
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    รหัสพัสดุ *
                  </label>
                  <input
                    name="code"
                    type="text"
                    required
                    defaultValue={String(inventory.length + 1)}
                    className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ชื่อพัสดุ / อุปกรณ์ *
                  </label>
                  <input
                    name="name"
                    type="text"
                    required
                    placeholder="เช่น รถเข็นนั่ง วีลแชร์ (Wheelchair)"
                    className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  หมวดหมู่พัสดุ *
                </label>
                <select
                  name="category"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-semibold"
                >
                  <option value="diaper">ผ้าอ้อมผู้ใหญ่</option>
                  <option value="nutrition">อาหารเสริมโภชนาการ / นม</option>
                  <option value="underpad">แผ่นรองซับสิ่งขับถ่าย</option>
                  <option value="equipment">กายอุปกรณ์ / อุปกรณ์ฟื้นฟู</option>
                  <option value="other">เวชภัณฑ์ / พัสดุอื่นๆ</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  คุณลักษณะ / สเปก
                </label>
                <textarea
                  name="specification"
                  rows={2}
                  placeholder="เช่น โครงเหล็กชุบโครเมียม พับเก็บได้ รองรับน้ำหนัก 100 กก."
                  className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    จำนวนสต็อกตั้งต้น *
                  </label>
                  <input
                    name="remainingStock"
                    type="number"
                    min={0}
                    required
                    defaultValue={10}
                    className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    หน่วยนับ *
                  </label>
                  <input
                    name="unit"
                    type="text"
                    required
                    placeholder="เช่น คัน, ชิ้น, กล่อง"
                    defaultValue="ชิ้น"
                    className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    หมายเลข Lot No.
                  </label>
                  <input
                    name="lotNo"
                    type="text"
                    placeholder="เช่น LOT-69-05"
                    className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    วันหมดอายุ
                  </label>
                  <input
                    name="expireDate"
                    type="date"
                    className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
                >
                  บันทึกพัสดุใหม่
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL 4: CONFIRM DELETE MODAL ===================== */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[140] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-base text-slate-900">ยืนยันการลบพัสดุ?</h4>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              คุณกำลังจะลบรายการ <strong className="text-slate-900">"{itemToDelete.name}"</strong> (รหัส {itemToDelete.code}) ซึ่งมียอดคงเหลือ{' '}
              <strong className="text-rose-600 font-bold">
                {itemToDelete.remainingStock.toLocaleString()} {itemToDelete.unit}
              </strong>{' '}
              ออกจากคลัง
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs"
              >
                ยืนยันลบพัสดุ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

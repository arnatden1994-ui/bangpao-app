import React, { useEffect, useRef, useState } from 'react';
import {
  MapPin,
  Navigation,
  Layers,
  Maximize2,
  Minimize2,
  ExternalLink,
  Check,
  Copy,
  Info,
} from 'lucide-react';

export interface VillagePreset {
  moo: string;
  name: string;
  landmark: string;
  lat: number;
  lng: number;
}

export const BANGPAO_VILLAGES: VillagePreset[] = [
  { moo: '1', name: 'บ้านชายวัด', landmark: 'ที่ทำการเทศบาล / วัดบางเป้า', lat: 7.429578, lng: 99.525737 },
  { moo: '2', name: 'บ้านเกาะปอม', landmark: 'ชุมชนบ้านเกาะปอม', lat: 7.421512, lng: 99.529104 },
  { moo: '3', name: 'บ้านตลาดใหม่', landmark: 'ย่านการค้าตลาดใหม่ / ถนนสายหลัก', lat: 7.416288, lng: 99.519842 },
  { moo: '4', name: 'บ้านแหลมม่วง', landmark: 'ชุมชนบ้านแหลมม่วง', lat: 7.411645, lng: 99.531215 },
  { moo: '5', name: 'บ้านป่าเตียว', landmark: 'ชุมชนบ้านป่าเตียว', lat: 7.405812, lng: 99.524109 },
  { moo: '6', name: 'บ้านควนทองสีห์', landmark: 'ชุมชนบ้านควนทองสีห์', lat: 7.419320, lng: 99.538410 },
  { moo: '7', name: 'บ้านท่าเรือ', landmark: 'ชุมชนบ้านท่าเรือ / ปากน้ำ', lat: 7.402190, lng: 99.514280 },
];

interface CitizenMapPickerProps {
  lat: number;
  lng: number;
  moo: string;
  landmark?: string;
  onLocationChange: (lat: number, lng: number, moo?: string, landmark?: string) => void;
  accentColor?: 'emerald' | 'blue' | 'teal';
  label?: string;
  helpText?: string;
}

export const CitizenMapPicker: React.FC<CitizenMapPickerProps> = ({
  lat,
  lng,
  moo,
  landmark = '',
  onLocationChange,
  accentColor = 'emerald',
  label = 'แผนที่ปักหมุดจุดเกิดเหตุ / บ้านที่ต้องการรับบริการ',
  helpText = 'หากไม่ได้อยู่ที่บ้าน ให้แตะบนแผนที่หรือลากหมุดสีแดง 📍 ไปวางบนบ้านของท่านได้โดยตรง',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);

  const [mapType, setMapType] = useState<'satellite' | 'street'>('satellite');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Styling helpers
  const theme = {
    emerald: {
      btnActive: 'bg-emerald-700 text-white shadow-md',
      btnHover: 'hover:bg-emerald-100 text-slate-700 border-slate-300',
      badge: 'bg-emerald-950 text-white border-emerald-400/40',
      accentText: 'text-emerald-300',
      gpsBtn: 'bg-emerald-700 hover:bg-emerald-800 text-white',
      border: 'border-emerald-300',
      ring: 'focus:ring-emerald-500',
    },
    blue: {
      btnActive: 'bg-blue-700 text-white shadow-md',
      btnHover: 'hover:bg-blue-100 text-slate-700 border-slate-300',
      badge: 'bg-slate-900 text-white border-blue-400/40',
      accentText: 'text-blue-300',
      gpsBtn: 'bg-blue-700 hover:bg-blue-800 text-white',
      border: 'border-blue-300',
      ring: 'focus:ring-blue-500',
    },
    teal: {
      btnActive: 'bg-teal-700 text-white shadow-md',
      btnHover: 'hover:bg-teal-100 text-slate-700 border-slate-300',
      badge: 'bg-teal-950 text-white border-teal-400/40',
      accentText: 'text-teal-300',
      gpsBtn: 'bg-teal-700 hover:bg-teal-800 text-white',
      border: 'border-teal-300',
      ring: 'focus:ring-teal-500',
    },
  }[accentColor];

  // Tile layer URL
  const getTileUrl = (type: 'satellite' | 'street') => {
    return type === 'satellite'
      ? 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  };

  // Initialize or update Leaflet map
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !containerRef.current) return;

    const currentCenter = [lat || 7.429578, lng || 99.525737];

    if (!mapRef.current) {
      if ((containerRef.current as any)._leaflet_id) {
        (containerRef.current as any)._leaflet_id = null;
        containerRef.current.innerHTML = '';
      }

      const map = L.map(containerRef.current, {
        center: currentCenter,
        zoom: 16,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      const tileLayer = L.tileLayer(getTileUrl(mapType), {
        maxZoom: 20,
        subdomains: mapType === 'satellite' ? ['mt0', 'mt1', 'mt2', 'mt3'] : ['a', 'b', 'c'],
        attribution: mapType === 'satellite' ? '© Google Maps' : '© OpenStreetMap',
      }).addTo(map);
      tileLayerRef.current = tileLayer;

      const markerIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      const marker = L.marker(currentCenter, {
        icon: markerIcon,
        draggable: true,
      }).addTo(map);

      marker.bindTooltip('📍 ลากหรือแตะบนแผนที่เพื่อระบุบ้าน', {
        permanent: true,
        direction: 'top',
        offset: [0, -36],
      });

      // Handle marker dragend
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        const newLat = parseFloat(pos.lat.toFixed(6));
        const newLng = parseFloat(pos.lng.toFixed(6));
        onLocationChange(newLat, newLng);
      });

      // Handle map click
      map.on('click', (e: any) => {
        const newLat = parseFloat(e.latlng.lat.toFixed(6));
        const newLng = parseFloat(e.latlng.lng.toFixed(6));
        marker.setLatLng([newLat, newLng]);
        onLocationChange(newLat, newLng);
      });

      mapRef.current = map;
      markerRef.current = marker;

      setTimeout(() => {
        map.invalidateSize();
      }, 150);
    } else {
      // Sync marker position if props changed externally
      if (markerRef.current) {
        const cur = markerRef.current.getLatLng();
        if (Math.abs(cur.lat - lat) > 0.0001 || Math.abs(cur.lng - lng) > 0.0001) {
          markerRef.current.setLatLng([lat, lng]);
          mapRef.current.setView([lat, lng], mapRef.current.getZoom(), { animate: true });
        }
      }
      mapRef.current.invalidateSize();
    }
  }, [lat, lng]);

  // Update tile layer when mapType changes
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current) return;

    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }

    const newLayer = L.tileLayer(getTileUrl(mapType), {
      maxZoom: 20,
      subdomains: mapType === 'satellite' ? ['mt0', 'mt1', 'mt2', 'mt3'] : ['a', 'b', 'c'],
      attribution: mapType === 'satellite' ? '© Google Maps' : '© OpenStreetMap',
    }).addTo(mapRef.current);

    tileLayerRef.current = newLayer;
  }, [mapType]);

  // Smooth resize when toggling fullscreen
  useEffect(() => {
    if (!mapRef.current) return;
    const timers = [50, 150, 300].map((ms) =>
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
          if (markerRef.current) {
            mapRef.current.setView(markerRef.current.getLatLng(), mapRef.current.getZoom(), {
              animate: false,
            });
          }
        }
      }, ms)
    );
    return () => timers.forEach(clearTimeout);
  }, [isFullscreen]);

  // Handle GPS button
  const handleGetLiveGPS = () => {
    if (!navigator.geolocation) {
      alert('อุปกรณ์ของคุณไม่รองรับการดึงพิกัด GPS อัตโนมัติ กรุณาคลิกเลือกตำแหน่งบนแผนที่แทน');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const newLat = parseFloat(pos.coords.latitude.toFixed(6));
        const newLng = parseFloat(pos.coords.longitude.toFixed(6));
        if (markerRef.current && mapRef.current) {
          markerRef.current.setLatLng([newLat, newLng]);
          mapRef.current.flyTo([newLat, newLng], 17);
        }
        onLocationChange(newLat, newLng, undefined, `พิกัด GPS ปัจจุบัน (${newLat}, ${newLng})`);
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        alert('ไม่สามารถดึงพิกัด GPS อัตโนมัติได้ กรุณาคลิกเลือกหมู่บ้านหรือแตะบนแผนที่');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Jump to village preset
  const handleJumpVillage = (v: VillagePreset) => {
    if (markerRef.current && mapRef.current) {
      markerRef.current.setLatLng([v.lat, v.lng]);
      mapRef.current.flyTo([v.lat, v.lng], 16, { animate: true });
    }
    onLocationChange(v.lat, v.lng, v.moo, `หมู่ ${v.moo} ${v.name} (${v.landmark})`);
  };

  // Copy coordinates
  const handleCopyCoords = () => {
    navigator.clipboard.writeText(`${lat}, ${lng}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      {/* Header with Title and GPS Button */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-1">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-rose-500" />
          <span className="font-bold text-slate-800 text-sm sm:text-base">{label}</span>
        </div>
        <button
          type="button"
          onClick={handleGetLiveGPS}
          disabled={isLocating}
          className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50 transition-all ${theme.gpsBtn}`}
          title="ใช้ตำแหน่งปัจจุบันของผู้ใช้งาน (หากอยู่ที่บ้านขณะยื่น)"
        >
          <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
          <span>{isLocating ? 'กำลังดึงพิกัด...' : '📍 ใช้ตำแหน่งปัจจุบัน'}</span>
        </button>
      </div>

      {/* Helpful Hint */}
      <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs sm:text-sm text-amber-900 leading-relaxed">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <span>
          <strong>คำแนะนำ:</strong> {helpText}
        </span>
      </div>

      {/* Village Preset Pills */}
      <div>
        <div className="text-xs font-bold text-slate-600 mb-1.5">
          คลิกเลือกหมู่บ้านเพื่อซูมแผนที่ไปยังชุมชนของท่าน:
        </div>
        <div className="flex flex-wrap gap-1.5">
          {BANGPAO_VILLAGES.map((v) => (
            <button
              key={v.moo}
              type="button"
              onClick={() => handleJumpVillage(v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                moo === v.moo
                  ? theme.btnActive
                  : `bg-white ${theme.btnHover} border`
              }`}
            >
              ม.{v.moo} {v.name}
            </button>
          ))}
        </div>
      </div>

      {/* Map Container (Normal or Fullscreen Modal) */}
      <div
        className={
          isFullscreen
            ? 'fixed inset-0 z-[9999] bg-slate-950/85 p-3 sm:p-6 flex flex-col items-center justify-center animate-in fade-in duration-200'
            : 'relative'
        }
      >
        <div
          className={`w-full rounded-2xl border-2 ${theme.border} overflow-hidden shadow-inner bg-slate-100 flex flex-col ${
            isFullscreen
              ? 'h-full max-w-6xl shadow-2xl bg-white ring-4 ring-emerald-500/50'
              : 'h-[360px] sm:h-[400px]'
          }`}
        >
          {/* Top Map Controls Bar */}
          <div className="bg-slate-900/90 text-white px-3 py-2 flex items-center justify-between text-xs z-10">
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="font-bold flex items-center gap-1 text-emerald-400">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>แตะ/ลากหมุดแดงเพื่อระบุบ้าน</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Layer Toggle */}
              <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                <button
                  type="button"
                  onClick={() => setMapType('satellite')}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    mapType === 'satellite'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="ภาพถ่ายทางอากาศเห็นหลังคาบ้านและต้นไม้ชัดเจน"
                >
                  🛰️ ดาวเทียม
                </button>
                <button
                  type="button"
                  onClick={() => setMapType('street')}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    mapType === 'street'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="แผนที่เส้นทางและชื่อถนน"
                >
                  🗺️ ถนน
                </button>
              </div>

              {/* Fullscreen Button */}
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 border border-slate-700 cursor-pointer"
                title={isFullscreen ? 'ย่อหน้าจอ' : 'ขยายเต็มหน้าจอเพื่อปักหมุดชัดเจน'}
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">ย่อขนาด</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>ขยายเต็มจอ</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Leaflet Map Div */}
          <div ref={containerRef} className="w-full flex-1 relative z-0" />

          {/* Bottom Bar in Fullscreen */}
          {isFullscreen && (
            <div className="p-3 bg-slate-900 border-t border-slate-700 flex items-center justify-between gap-3 text-white text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <span className="font-mono text-emerald-300 font-bold">
                  พิกัด: {lat.toFixed(6)}, {lng.toFixed(6)}
                </span>
                {landmark && <span className="text-slate-300 hidden sm:inline">• {landmark}</span>}
              </div>
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm cursor-pointer shadow-lg active:scale-95 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>ยืนยันพิกัดนี้และปิดแผนที่</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Coordinate & Google Maps Navigation Badge */}
      <div className={`p-3.5 rounded-2xl border ${theme.badge} space-y-1.5`}>
        <div className="flex items-center justify-between text-xs sm:text-sm font-bold flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className={theme.accentText}>พิกัด GPS สำหรับเจ้าหน้าที่ลงพื้นที่:</span>
            <span className="font-mono text-white bg-white/10 px-2 py-0.5 rounded-md">
              {lat.toFixed(6)}, {lng.toFixed(6)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCoords}
              className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer flex items-center gap-1"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอกพิกัด'}</span>
            </button>

            <a
              href={`https://www.google.com/maps?q=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer flex items-center gap-1 shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>เปิดดูใน Google Maps</span>
            </a>
          </div>
        </div>

        {landmark && (
          <div className="text-xs text-slate-300 font-medium">
            จุดสังเกต / ชุมชน: {landmark}
          </div>
        )}
      </div>
    </div>
  );
};

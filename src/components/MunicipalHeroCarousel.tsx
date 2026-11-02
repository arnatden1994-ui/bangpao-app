import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Plus,
  Calendar,
  FileText,
  ExternalLink,
  Sparkles,
  MapPin,
  Clock,
  Megaphone,
  Download,
  Eye,
  Building2,
  HeartHandshake,
  ShieldCheck,
} from 'lucide-react';
import { CalendarEventItem, CalendarAttachment, ACTIVITY_DOC_TYPES } from './MunicipalCalendarPanel.tsx';

interface HeroSlide {
  id: string;
  badge: string;
  badgeColor: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  dateStr?: string;
  location?: string;
  hasAttachment?: boolean;
  attachmentName?: string;
  attachmentUrl?: string;
  eventRef?: CalendarEventItem;
  docTypeEmoji?: string;
}

interface MunicipalHeroCarouselProps {
  events: CalendarEventItem[];
  onOpenCreateActivity: () => void;
  onOpenAttachment?: (att: CalendarAttachment, event?: CalendarEventItem) => void;
  onOpenActivityDetails?: (event: CalendarEventItem) => void;
  onScrollToCalendar?: () => void;
}

export const MunicipalHeroCarousel: React.FC<MunicipalHeroCarouselProps> = ({
  events,
  onOpenCreateActivity,
  onOpenAttachment,
  onOpenActivityDetails,
  onScrollToCalendar,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Build slides: Combine user activities with official Bangpao Municipal slides
  const slides: HeroSlide[] = React.useMemo(() => {
    const list: HeroSlide[] = [];

    // 1. User events with category === 'activity' or attachments
    const userActivities = events.filter(
      (e) => e.category === 'activity' || (e.attachments && e.attachments.length > 0)
    );

    userActivities.slice(0, 4).forEach((act, idx) => {
      const docMeta = act.docType ? ACTIVITY_DOC_TYPES[act.docType] : null;
      const firstAtt = act.attachments?.[0];
      const hasImg = firstAtt?.fileType?.startsWith('image/') || firstAtt?.fileUrl?.startsWith('data:image/');

      const fallbackImages = [
        '/municipal/slideheader_1.jpg',
        '/municipal/slideheader_2.jpg',
        '/municipal/slideheader_3.jpg',
        '/municipal/slideheader_4.jpg',
        '/municipal/slideheader_5.jpg',
      ];

      list.push({
        id: `user-${act.id}`,
        badge: docMeta ? docMeta.label : '📢 กิจกรรมประชาสัมพันธ์',
        badgeColor: 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white',
        title: act.title,
        subtitle: act.fromAgency ? `หน่วยงาน: ${act.fromAgency}` : 'กองสาธารณสุขและสิ่งแวดล้อม ทต.บางเป้า',
        description: act.description || 'ขอเชิญเจ้าหน้าที่และผู้เกี่ยวข้องเข้าร่วมกิจกรรมตามกำหนดการ',
        imageUrl: hasImg && firstAtt?.fileUrl ? firstAtt.fileUrl : fallbackImages[idx % fallbackImages.length],
        dateStr: act.date ? `วันที่: ${act.date} ${act.time ? `• เวลา ${act.time} น.` : ''}` : undefined,
        location: act.location,
        hasAttachment: (act.attachments && act.attachments.length > 0),
        attachmentName: firstAtt?.name,
        attachmentUrl: firstAtt?.fileUrl,
        eventRef: act,
        docTypeEmoji: docMeta?.emoji || '📢',
      });
    });

    // 2. Default Official Bang Pao Municipal Showcase Slides
    const defaultMunicipalSlides: HeroSlide[] = [
      {
        id: 'official-1',
        badge: '🏛️ เทศบาลตำบลบางเป้า อ.กันตัง จ.ตรัง',
        badgeColor: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white',
        title: 'มุ่งมั่นพัฒนา เพื่อความเป็นอยู่ที่ดีขึ้นของทุกคน',
        subtitle: 'กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า',
        description:
          'บูรณาการระบบงานสาธารณสุขครบ 4 มิติ ตรวจสุขาภิบาลกิจการ ดูแลผู้ป่วยติดเตียง LTC ยืม-คืนอุปกรณ์ และบริการรถดูดสิ่งปฏิกูลเพื่อชุมชน',
        imageUrl: '/municipal/slideheader_1.jpg',
        location: 'สำนักงานเทศบาลตำบลบางเป้า เลขที่ 109 ม.6 ต.บางเป้า อ.กันตัง',
      },
      {
        id: 'official-2',
        badge: '🍽️ สุขาภิบาลอาหาร & สิ่งแวดล้อม (EHWA)',
        badgeColor: 'bg-gradient-to-r from-amber-500 to-orange-600 text-white',
        title: 'ยกระดับมาตรฐานสถานประกอบกิจการ 36 แห่งทั่วตำบลบางเป้า',
        subtitle: 'ตรวจประเมินสุขลักษณะ 25 ข้อ พ.ร.บ.การสาธารณสุข พ.ศ. 2535',
        description:
          'คุ้มครองผู้บริโภคและนักท่องเที่ยว ตรวจสุขาภิบาลตลาดสด ร้านอาหาร และกิจการที่เป็นอันตรายต่อสุขภาพอย่างต่อเนื่อง',
        imageUrl: '/municipal/slideheader_2.jpg',
        location: 'ร้านอาหารและสถานประกอบการ 7 หมู่บ้าน ต.บางเป้า',
      },
      {
        id: 'official-3',
        badge: '❤️ สปสช. & LTC กองทุนสุขภาพตำบล',
        badgeColor: 'bg-gradient-to-r from-rose-500 to-pink-600 text-white',
        title: 'ส่งมอบความห่วงใย ดูแลผู้ป่วยติดเตียงและผู้สูงอายุถึงบันไดบ้าน',
        subtitle: 'ระบบบริหารการจัดส่ง Smart Delivery Route ติดตามพิกัดดาวเทียม',
        description:
          'มอบชุดผ้าอ้อมและของใช้จำเป็นแก่ผู้มีภาวะพึ่งพิง 12 ราย ครอบคลุม 7 หมู่บ้าน พร้อมสนับสนุนเตียงและอุปกรณ์การแพทย์',
        imageUrl: '/municipal/slideheader_3.jpg',
        location: 'ชุมชนตำบลบางเป้า (ม.1 - ม.7) อ.กันตัง จ.ตรัง',
      },
      {
        id: 'official-4',
        badge: '🚛 One Stop Service บริการประชาชน',
        badgeColor: 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white',
        title: 'ยื่นคำร้องสูบสิ่งปฏิกูล & ร้องทุกข์เหตุรำคาญออนไลน์ 24 ชม.',
        subtitle: 'พอร์ทัลบริการประชาชนเทศบาลตำบลบางเป้า (Citizen Portal)',
        description:
          'ประชาชนสามารถปักหมุดบ้าน แจ้งเรื่องเดือดร้อน และติดตามสถานะแบบเรียลไทม์ โดยไม่ต้องเดินทางมาที่เทศบาล',
        imageUrl: '/municipal/slideheader_4.jpg',
        location: 'https://bangpao-app.vercel.app/?portal=citizen',
      },
    ];

    // Combine, keeping maximum 6 high-impact slides
    return [...list, ...defaultMunicipalSlides].slice(0, 6);
  }, [events]);

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying || isHovered || slides.length <= 1) return;

    timerRef.current = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % slides.length);
    }, 6000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, isHovered, slides.length]);

  const handlePrev = () => {
    setCurrentIdx((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    setCurrentIdx((prev) => (prev + 1) % slides.length);
  };

  const curSlide = slides[currentIdx] || slides[0];

  return (
    <div
      className="relative rounded-3xl overflow-hidden shadow-2xl border border-emerald-500/30 group bg-slate-950 text-white"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background Image with Cinematic Overlay */}
      <div className="relative h-[320px] sm:h-[380px] md:h-[420px] w-full overflow-hidden">
        {slides.map((slide, idx) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === currentIdx ? 'opacity-100 z-10 scale-100' : 'opacity-0 z-0 scale-105 pointer-events-none'
            }`}
          >
            <img
              src={slide.imageUrl}
              alt={slide.title}
              className="w-full h-full object-cover object-center transform transition-transform duration-7000 ease-out"
              onError={(e) => {
                // Fallback to local official municipal slide if image fails
                (e.target as HTMLImageElement).src = '/municipal/slideheader_1.jpg';
              }}
            />
            {/* Rich Vignette & Gradient Overlays for Maximum Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/65 to-slate-950/20" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-transparent" />
          </div>
        ))}

        {/* Top Floating Badge & Action Header */}
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between gap-3 pointer-events-auto">
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-black shadow-lg backdrop-blur-md border border-white/20 flex items-center gap-1.5 ${curSlide.badgeColor}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{curSlide.badge}</span>
            </span>

            <span className="hidden md:inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-900/70 border border-emerald-400/30 text-emerald-300 backdrop-blur-md">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>ทต.บางเป้า อ.กันตัง จ.ตรัง</span>
            </span>
          </div>

          {/* Quick Admin Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenCreateActivity}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/60 transition-all hover:scale-105 cursor-pointer ring-2 ring-emerald-300/80"
              title="เพิ่มภาพกิจกรรมใหม่ หรือบันทึกหนังสือเชิญประชุม/อบรม A4"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">+ อัปเดตกิจกรรม / แนบหนังสือ A4</span>
              <span className="sm:hidden">+ เพิ่มกิจกรรม</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded-xl bg-slate-900/70 hover:bg-slate-800/90 text-slate-300 hover:text-white border border-white/10 backdrop-blur-md transition-all cursor-pointer"
              title={isPlaying ? 'หยุดเล่นชั่วคราว' : 'เล่นภาพสไลด์อัตโนมัติ'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Main Content Area (Left-aligned & Bottom-anchored) */}
        <div className="absolute bottom-6 left-5 right-5 sm:left-8 sm:right-8 z-20 max-w-3xl space-y-2.5">
          <div className="space-y-1">
            <p className="text-xs sm:text-sm font-bold text-amber-300 flex items-center gap-2">
              <span>{curSlide.docTypeEmoji || '🏛️'}</span>
              <span>{curSlide.subtitle}</span>
            </p>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight leading-snug drop-shadow-md">
              {curSlide.title}
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-slate-200/90 line-clamp-2 leading-relaxed font-light max-w-2xl drop-shadow-sm">
            {curSlide.description}
          </p>

          {/* Meta Info Bar: Date, Location, File */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-slate-300 pt-1">
            {curSlide.dateStr && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700/80 font-medium">
                <Clock className="w-3.5 h-3.5 text-amber-300" />
                <span>{curSlide.dateStr}</span>
              </span>
            )}

            {curSlide.location && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700/80 font-medium truncate max-w-xs">
                <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="truncate">{curSlide.location}</span>
              </span>
            )}

            {curSlide.hasAttachment && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-bold">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>มีเอกสารแนบ A4 ({curSlide.attachmentName || 'ไฟล์ราชการ'})</span>
              </span>
            )}
          </div>

          {/* Interactive CTAs */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            {curSlide.eventRef ? (
              <>
                <button
                  type="button"
                  onClick={() => onOpenActivityDetails && onOpenActivityDetails(curSlide.eventRef!)}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md transition-all hover:scale-105 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-emerald-700" />
                  <span>ดูรายละเอียดกิจกรรม</span>
                </button>

                {curSlide.hasAttachment && curSlide.eventRef.attachments?.[0] && (
                  <button
                    type="button"
                    onClick={() =>
                      onOpenAttachment &&
                      onOpenAttachment(curSlide.eventRef!.attachments![0], curSlide.eventRef)
                    }
                    className="px-4 py-2 rounded-xl bg-emerald-800/90 hover:bg-emerald-700 text-emerald-100 hover:text-white border border-emerald-400/40 font-bold text-xs flex items-center gap-1.5 backdrop-blur-md shadow-md transition-all hover:scale-105 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-300" />
                    <span>เปิดดูหนังสือ A4 / ไฟล์แนบ</span>
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (onScrollToCalendar) onScrollToCalendar();
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 transition-all hover:scale-105 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 text-amber-300" />
                  <span>เปิดดูในปฏิทินเทศบาล</span>
                </button>

                <a
                  href="https://bangpao.go.th/public/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs flex items-center gap-1.5 backdrop-blur-md transition-all cursor-pointer"
                >
                  <span>เว็บหลักเทศบาล bangpao.go.th</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
                </a>
              </>
            )}
          </div>
        </div>

        {/* Navigation Arrows (Left & Right) */}
        <button
          type="button"
          onClick={handlePrev}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-900/60 hover:bg-slate-900/90 text-white border border-white/20 flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 hover:scale-110 cursor-pointer backdrop-blur-sm"
          title="สไลด์ก่อนหน้า"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-900/60 hover:bg-slate-900/90 text-white border border-white/20 flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 hover:scale-110 cursor-pointer backdrop-blur-sm"
          title="สไลด์ถัดไป"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Slide Indicators / Dots */}
        <div className="absolute bottom-4 right-5 sm:right-8 z-20 flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIdx(idx)}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                idx === currentIdx
                  ? 'w-7 bg-gradient-to-r from-amber-400 to-emerald-400'
                  : 'w-2 bg-white/40 hover:bg-white/70'
              }`}
              title={`สไลด์ที่ ${idx + 1}`}
            />
          ))}
          <span className="text-[10px] font-mono text-slate-300 ml-1">
            {currentIdx + 1}/{slides.length}
          </span>
        </div>
      </div>
    </div>
  );
};

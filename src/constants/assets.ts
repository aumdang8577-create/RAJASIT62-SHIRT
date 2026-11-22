export const ORIGINAL_IMAGE_URL =
  '/assets/aistudio/360_F_382467776_ytKFK6HCFeimOWMhRc4tW7qMP5363Hzr_f826e0c0.jpg';

export const CLEANED_IMAGE_URL =
  '/src/assets/images/polo_mockup_no_logo_1795338673754.jpg';

export const USER_LOGO_URL =
  '/assets/aistudio/jacket-chest-stacked-preview_dfa13009.png';

export const HEX_EMBLEM_LOGO_URL =
  '/assets/aistudio/image_a9600d6b.png';

export interface InspectHotspot {
  id: string;
  label: string;
  detail: string;
  /** Normalized center coordinates (0..1) on the 3:2 image */
  x: number;
  y: number;
  zoom: number;
}

export const SLEEVE_HOTSPOTS: InspectHotspot[] = [
  {
    id: 'front-left-sleeve',
    label: 'ปลายแขนซ้าย (ด้านหน้า)',
    detail: 'วางโลโก้ขนาดเล็กเหนือแถบแขนกรมท่า 1 ซม.',
    x: 0.932,
    y: 0.425,
    zoom: 3.1,
  },
  {
    id: 'angled-left-sleeve',
    label: 'ปลายแขนซ้าย (มุมเอียง 3/4)',
    detail: 'เอียงขนานตามแนวแถบแขนซ้าย เหนือแถบ 1 ซม.',
    x: 0.568,
    y: 0.365,
    zoom: 3.1,
  },
  {
    id: 'back-left-sleeve',
    label: 'ปลายแขนซ้าย (ด้านหลัง)',
    detail: 'ตำแหน่งแขนซ้ายเมื่อมองจากด้านหลังเสื้อ',
    x: 0.095,
    y: 0.615,
    zoom: 3.4,
  },
  {
    id: 'mini-left-sleeve',
    label: 'ปลายแขนซ้าย (มุมเล็กบน)',
    detail: 'วางตำแหน่งแขนซ้ายสอดคล้องกันครบทุกมุม',
    x: 0.218,
    y: 0.238,
    zoom: 3.4,
  },
  {
    id: 'front-chest-clean',
    label: 'หน้าอกและปกคอ (ไร้โลโก้เดิม)',
    detail: 'ตรวจสอบความเรียบเนียนของเนื้อผ้าหลังลบโลโก้เดิม',
    x: 0.785,
    y: 0.34,
    zoom: 2.3,
  },
];

export interface AngleCropSpec {
  id: string;
  title: string;
  subtitle: string;
  aspectLabel: string;
  filename: string;
  /** Normalized crop rect (0..1) on the 3:2 source image */
  rect: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

export const ANGLE_CROPS: AngleCropSpec[] = [
  {
    id: 'full-sheet',
    title: '01. ภาพรวมครบ 4 มุม',
    subtitle: 'ติดโลโก้ปลายแขนซ้ายเหนือแถบแขน 1 ซม. ครบทุกมุม',
    aspectLabel: '3:2',
    filename: 'polo-sleeve-logo-full.png',
    rect: { x: 0, y: 0, w: 1, h: 1 },
  },
  {
    id: 'front-hero',
    title: '02. เสื้อด้านหน้าเต็มตัว',
    subtitle: 'มุมตรง เห็นโลโก้ปลายแขนซ้ายและปกกรมท่าชัดเจน',
    aspectLabel: '4:5',
    filename: 'polo-sleeve-logo-front.png',
    rect: { x: 0.61, y: 0.08, w: 0.39, h: 0.84 },
  },
  {
    id: 'angled-three-quarter',
    title: '03. มุมเอียง 3/4',
    subtitle: 'เห็นด้านข้างแขนซ้ายและรายละเอียดโลโก้ชัดที่สุด',
    aspectLabel: '4:5',
    filename: 'polo-sleeve-logo-angled.png',
    rect: { x: 0.26, y: 0.08, w: 0.37, h: 0.84 },
  },
  {
    id: 'back-view',
    title: '04. มุมด้านหลัง',
    subtitle: 'ด้านหลังเรียบสะอาดพร้อมโลโก้เล็กที่ปลายแขนซ้าย',
    aspectLabel: '1:1',
    filename: 'polo-sleeve-logo-back.png',
    rect: { x: 0.03, y: 0.49, w: 0.24, h: 0.39 },
  },
];

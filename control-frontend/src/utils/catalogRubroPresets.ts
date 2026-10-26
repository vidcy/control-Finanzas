export interface CatalogBannerItem {
  id: string;
  title: string;
  subtitle: string;
  highlight: string;
  badge: string;
  image: string;
  ctaText: string;
}

export interface CatalogLookItem {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  image: string;
}

export interface CatalogShowcaseRailItem {
  id?: string;
  brand: string;
  title: string;
  desc: string;
  img: string;
}

export interface CatalogConfig {
  rubroKey?: string;
  rubroLabel?: string;
  variantLabel?: string; // ej: "Tallas", "Medidas", "Capacidad", "Presentaciones"
  catalogTitle?: string;
  catalogSubtitle?: string;
  catalogBadge?: string;
  announcement?: string;
  whatsappPhone?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
  footerAbout?: string;
  banners?: CatalogBannerItem[];
  tickerPhrases?: string[];
  // Lookbook / Galería
  showLookbook?: boolean;
  lookbookTitle?: string;
  lookbookSubtitle?: string;
  lookbookItems?: CatalogLookItem[];
  // Ubicación & Showroom
  showLocation?: boolean;
  locationCity?: string;
  locationAddress?: string;
  locationLandmarks?: string;
  locationSchedule?: string;
  locationMapsUrl?: string;
  locationImage?: string;
  // Carrusel / Vitrina inferior de marcas o líneas (Showcase Rail)
  showShowcaseRail?: boolean;
  showcaseRailTitle?: string;
  showcaseRailSubtitle?: string;
  showcaseRailItems?: CatalogShowcaseRailItem[];
  lookbookBadge?: string;
  navCatalogTitle?: string;
  navLookbookTitle?: string;
  navLocationTitle?: string;
  searchPlaceholder?: string;
}

export interface RubroPreset {
  key: string;
  label: string;
  icon: string;
  variantLabel: string;
  catalogBadge: string;
  catalogTitle: string;
  catalogSubtitle: string;
  announcement: string;
  tickerPhrases: string[];
  banners: CatalogBannerItem[];
  lookbookTitle: string;
  lookbookSubtitle: string;
  lookbookItems: CatalogLookItem[];
  showcaseRailTitle: string;
  showcaseRailSubtitle: string;
  showcaseRailItems: CatalogShowcaseRailItem[];
  footerAbout: string;
  showShowcaseRail?: boolean;
  navCatalogTitle?: string;
  navLookbookTitle?: string;
  navLocationTitle?: string;
  searchPlaceholder?: string;
  lookbookBadge?: string;
  locationAddress?: string;
  locationLandmarks?: string;
  locationSchedule?: string;
  locationMapsUrl?: string;
}

export const RUBRO_PRESETS: Record<string, RubroPreset> = {
  ELECTRODOMESTICOS: {
    key: "ELECTRODOMESTICOS",
    label: "Electrodomésticos, Línea Blanca y Hogar",
    icon: "🧊",
    variantLabel: "Capacidad / Medidas / Voltaje",
    catalogBadge: "ELECTRODOMÉSTICOS & LÍNEA BLANCA",
    catalogTitle: "Catálogo de Electrodomésticos & Equipamiento",
    catalogSubtitle: "Refrigeradoras, lavadoras, congeladoras, cocinas, licuadoras y electrodomésticos para el hogar con garantía oficial y despacho rápido.",
    announcement: "¡Promociones exclusivas en electrodomésticos y línea blanca! Envíos e instalación a domicilio.",
    tickerPhrases: [
      "REFRIGERADORAS, LAVADORAS Y CONGELADORAS ORIGINALES",
      "GARANTÍA OFICIAL DE FÁBRICA & SERVICIO TÉCNICO",
      "DESPACHO RÁPIDO E INSTALACIÓN A DOMICILIO",
      "PRECIOS Y PROMOCIONES EXCLUSIVAS POR WHATSAPP",
      "ELECTRODOMÉSTICOS DE ALTA EFICIENCIA ENERGÉTICA",
    ],
    banners: [
      {
        id: "banner-elec-1",
        title: "LÍNEA BLANCA & REFRIGERACIÓN",
        highlight: "TECNOLOGÍA INVERTER & AHORRO",
        subtitle: "Refrigeradoras no frost, congeladoras y conservadoras con máxima durabilidad.",
        badge: "GARANTÍA 1 AÑO",
        image: "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?q=80&w=1800&auto=format&fit=crop",
        ctaText: "Ver Refrigeradoras",
      },
      {
        id: "banner-elec-2",
        title: "LAVADO & CUIDADO DE PRENDAS",
        highlight: "LAVADORAS AUTOMÁTICAS & SECADORAS",
        subtitle: "Capacidad de 10kg a 22kg con múltiples programas inteligentes de lavado.",
        badge: "NUEVOS MODELOS",
        image: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?q=80&w=1800&auto=format&fit=crop",
        ctaText: "Ver Lavadoras",
      },
      {
        id: "banner-elec-3",
        title: "COCINA & PEQUEÑOS ELECTRODOMÉSTICOS",
        highlight: "LICUADORAS, COCINAS & MICROONDAS",
        subtitle: "Potencia, durabilidad y diseño moderno para facilitar tu cocina diaria.",
        badge: "OFERTAS TOP",
        image: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=1800&auto=format&fit=crop",
        ctaText: "Ver Electro Menor",
      },
    ],
    lookbookTitle: "Líneas de Electrodomésticos Destacadas",
    lookbookSubtitle: "Equipos de última generación diseñados para el confort y la eficiencia en tu hogar.",
    lookbookItems: [
      {
        id: "look-el1",
        title: "Refrigeración & Congelación",
        subtitle: "Sistemas no frost, dispensadores y enfriamiento uniforme.",
        tag: "LÍNEA FRÍO",
        image: "https://images.unsplash.com/photo-1584992236310-6edddc08acff?q=80&w=800&auto=format&fit=crop",
      },
      {
        id: "look-el2",
        title: "Lavado & Secado Inteligente",
        subtitle: "Tambores de acero inoxidable y tecnología de bajo consumo de agua.",
        tag: "LAVADO",
        image: "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?q=80&w=800&auto=format&fit=crop",
      },
      {
        id: "look-el3",
        title: "Cocina & Electro Menor",
        subtitle: "Licuadoras de alta potencia, batidoras, microondas y freidoras de aire.",
        tag: "COCINA",
        image: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?q=80&w=800&auto=format&fit=crop",
      },
    ],
    showcaseRailTitle: "Líneas Principales de Electrodomésticos",
    showcaseRailSubtitle: "Equipamiento para cada espacio de tu hogar con garantía",
    showcaseRailItems: [
      {
        id: "rail-el-1",
        brand: "REFRIGERACIÓN",
        title: "Refrigeradoras No Frost",
        desc: "Capacidades de 250L a 600L Inverter",
        img: "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?q=80&w=600&auto=format&fit=crop",
      },
      {
        id: "rail-el-2",
        brand: "LAVADO",
        title: "Lavadoras Automáticas",
        desc: "Carga frontal y superior de alta eficiencia",
        img: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?q=80&w=600&auto=format&fit=crop",
      },
      {
        id: "rail-el-3",
        brand: "CONGELADORES",
        title: "Congeladoras Horizontales",
        desc: "Conservación comercial y hogareña",
        img: "https://images.unsplash.com/photo-1584992236310-6edddc08acff?q=80&w=600&auto=format&fit=crop",
      },
      {
        id: "rail-el-4",
        brand: "COCINA",
        title: "Cocinas & Hornos",
        desc: "A gas y vitrocerámica con quemadores potentes",
        img: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=600&auto=format&fit=crop",
      },
      {
        id: "rail-el-5",
        brand: "LICUADORAS",
        title: "Licuadoras & Procesadores",
        desc: "Cuchillas de acero y motores reforzados",
        img: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?q=80&w=600&auto=format&fit=crop",
      },
      {
        id: "rail-el-6",
        brand: "PEQUEÑOS",
        title: "Microondas & Freidoras",
        desc: "Cocción rápida y saludable",
        img: "https://images.unsplash.com/photo-1585659722983-3a675dabf23d?q=80&w=600&auto=format&fit=crop",
      },
    ],
    footerAbout: "Especialistas en electrodomésticos, línea blanca y equipamiento para el hogar. Te brindamos garantía de fábrica, marcas líderes y servicio de despacho seguro.",
  },

  CALZADOS: {
    key: "CALZADOS",
    label: "Calzados, Zapatos y Accesorios",
    icon: "👠",
    variantLabel: "Tallas en Serie",
    catalogBadge: "VITRINA EXCLUSIVA DE CALZADOS",
    catalogTitle: "Colección de Calzados & Modelos",
    catalogSubtitle: "Modelos exclusivos con series completas de tallas, confort anatómico y acabados de primera calidad.",
    announcement: "¡Bienvenidos a nuestra tienda de calzados! Envíos rápidos y asesoría personalizada por WhatsApp.",
    tickerPhrases: [
      "100% CALZADOS ORIGINALES & ALTA CALIDAD",
      "SERIES Y CURVAS DE TALLAS DISPONIBLES",
      "VENTAS POR MAYOR Y DETALLE",
      "ENVÍOS SEGUROS A TODO EL PAÍS",
      "COLECCIÓN DE TEMPORADA 2026",
    ],
    banners: [
      {
        id: "banner-calz-1",
        title: "COLECCIÓN EXCLUSIVA & ALTA COSTURA",
        highlight: "MODELOS DE TEMPORADA 2026",
        subtitle: "Descubre nuestra selección de calzados con acabados de primera y confort insuperable.",
        badge: "100% ORIGINALES",
        image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=1800&auto=format&fit=crop",
        ctaText: "Ver Colección",
      },
      {
        id: "banner-calz-2",
        title: "ELEGANCIA & CONFORT EN CADA PASO",
        highlight: "LANZAMIENTOS & TENDENCIAS",
        subtitle: "Diseños anatómicos y siluetas sofisticadas para destacar en todo momento.",
        badge: "NUEVOS INGRESOS",
        image: "https://images.unsplash.com/photo-1535043934128-cf0b28d52f95?q=80&w=1800&auto=format&fit=crop",
        ctaText: "Explorar Modelos",
      },
    ],
    lookbookTitle: "Líneas & Tendencias de Calzado",
    lookbookSubtitle: "Diseño, confort y estilo adaptados para cada ocasión y preferencia.",
    lookbookItems: [
      {
        id: "look-1",
        title: "Stilettos & Tacos Finos",
        subtitle: "Elegancia y porte distinguido para galas y eventos.",
        tag: "ALTA GALA",
        image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop",
      },
      {
        id: "look-2",
        title: "Línea Confort & Diario",
        subtitle: "Plantillas acolchadas y flexibilidad para todo el día.",
        tag: "ULTRA CONFORT",
        image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=800&auto=format&fit=crop",
      },
      {
        id: "look-3",
        title: "Calzado de Vestir & Cuero",
        subtitle: "Acabados artesanales y durabilidad superior.",
        tag: "SELECTO",
        image: "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?q=80&w=800&auto=format&fit=crop",
      },
    ],
    showcaseRailTitle: "Marcas Oficiales & Líneas de Colección",
    showcaseRailSubtitle: "Curaduría selecta en marcas y confección de prestigio",
    showcaseRailItems: [
      {
        id: "rail-c-1",
        brand: "VIZZANO",
        title: "Stilettos & Glamour",
        desc: "Tacos aguja de alta costura",
        img: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=600&auto=format&fit=crop",
      },
      {
        id: "rail-c-2",
        brand: "MODARE",
        title: "Ultra Confort",
        desc: "Plantillas anatómicas acolchadas",
        img: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?q=80&w=600&auto=format&fit=crop",
      },
      {
        id: "rail-c-3",
        brand: "MARIMENA",
        title: "Gala & Strass",
        desc: "Diseños de fiesta y alfombra roja",
        img: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600&auto=format&fit=crop",
      },
      {
        id: "rail-c-4",
        brand: "EDWIN",
        title: "Línea Varones",
        desc: "Cueros selectos de vestir",
        img: "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?q=80&w=600&auto=format&fit=crop",
      },
      {
        id: "rail-c-5",
        brand: "XIOMARA",
        title: "Tendencia Chic",
        desc: "Tacones confort y modelos modernos",
        img: "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=600&auto=format&fit=crop",
      },
      {
        id: "rail-c-6",
        brand: "TRIKCS",
        title: "Urbano Premium",
        desc: "Calzados anatómicos resistentes",
        img: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=600&auto=format&fit=crop",
      },
    ],
    footerAbout: "Especialistas en calzado de alta calidad. Te ofrecemos atención personalizada, series completas y despacho rápido.",
  },

  ROPA_MODA: {
    key: "ROPA_MODA",
    label: "Boutique, Ropa y Confección",
    icon: "👗",
    variantLabel: "Tallas / Medidas",
    catalogBadge: "BOUTIQUE & ALTA MODA",
    catalogTitle: "Catálogo de Prendas & Tendencias",
    catalogSubtitle: "Moda contemporánea, cortes modernos y telas de alta calidad para renovar tu guardarropa.",
    announcement: "¡Nuevos ingresos de temporada! Consulta disponibilidad y tallas por WhatsApp.",
    tickerPhrases: [
      "PRENDAS EXCLUSIVAS DE TEMPORADA",
      "TALLAS COMPLETAS S, M, L, XL Y MÁS",
      "TELAS Y ACABADOS DE ALTA CALIDAD",
      "ENVÍOS A TODO EL PAÍS",
      "ATENCIÓN Y ASESORÍA PERSONALIZADA",
    ],
    banners: [
      {
        id: "banner-ropa-1",
        title: "TENDENCIAS & ALTA COSTURA",
        highlight: "NUEVA COLECCIÓN 2026",
        subtitle: "Prendas confeccionadas con los mejores materiales para un estilo impecable.",
        badge: "TENDENCIA 2026",
        image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1800&auto=format&fit=crop",
        ctaText: "Ver Colección",
      },
      {
        id: "banner-ropa-2",
        title: "ESTILO URBANO & CASUAL",
        highlight: "OUTFITS DE TEMPORADA",
        subtitle: "Comodidad y personalidad en cada combinación para tu día a día.",
        badge: "DESTACADOS",
        image: "https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=1800&auto=format&fit=crop",
        ctaText: "Ver Outfits",
      },
    ],
    lookbookTitle: "Inspiración de Outfits & Estilos",
    lookbookSubtitle: "Combinaciones armónicas pensadas para cada temporada y momento especial.",
    lookbookItems: [
      {
        id: "look-r1",
        title: "Prendas de Noche & Eventos",
        subtitle: "Telas satinadas y cortes elegantes para destacar.",
        tag: "GALA & NOCHE",
        image: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=800&auto=format&fit=crop",
      },
      {
        id: "look-r2",
        title: "Casual & Vanguardia",
        subtitle: "Prendas frescas, cómodas y combinables.",
        tag: "CASUAL CHIC",
        image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=800&auto=format&fit=crop",
      },
      {
        id: "look-r3",
        title: "Sastrería & Oficina",
        subtitle: "Cortes estructurados para el entorno ejecutivo.",
        tag: "FORMAL",
        image: "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?q=80&w=800&auto=format&fit=crop",
      },
    ],
    showcaseRailTitle: "Líneas de Moda & Colección",
    showcaseRailSubtitle: "Prendas seleccionadas con cortes y confección de alto nivel",
    showcaseRailItems: [
      {
        id: "rail-r-1",
        brand: "VESTIDOS",
        title: "Gala & Coctel",
        desc: "Seda, satín y pedrería sutil",
        img: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600&auto=format&fit=crop",
      },
      {
        id: "rail-r-2",
        brand: "CASUAL",
        title: "Urbano & Denim",
        desc: "Prendas cómodas de tendencia",
        img: "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=600&auto=format&fit=crop",
      },
      {
        id: "rail-r-3",
        brand: "SASTRERÍA",
        title: "Blazers & Pantalones",
        desc: "Cortes estructurados elegantes",
        img: "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?q=80&w=600&auto=format&fit=crop",
      },
    ],
    footerAbout: "Tu boutique de confianza con prendas seleccionadas, asesoría de imagen y entregas puntuales.",
  },

  FARMACIA: {
    key: "FARMACIA",
    label: "Farmacia, Botica y Salud",
    icon: "💊",
    variantLabel: "Presentaciones / Dosis",
    catalogBadge: "FARMACIA & CUIDADO DE LA SALUD",
    catalogTitle: "Catálogo de Medicamentos & Cuidado Personal",
    catalogSubtitle: "Productos farmacéuticos certificados, dermocosmética y bienestar integral con respaldo profesional.",
    announcement: "¡Atención farmacéutica y delivery express disponible! Escríbenos a nuestro WhatsApp.",
    tickerPhrases: [
      "MEDICAMENTOS 100% GARANTIZADOS & CERTIFICADOS",
      "ATENCIÓN Y CONSULTA FARMACÉUTICA",
      "DERMOCOSMÉTICA Y CUIDADO PERSONAL",
      "DELIVERY EXPRESS A DOMICILIO",
      "PRECIOS JUSTOS Y PROMOCIONES PERMANENTES",
    ],
    banners: [
      {
        id: "banner-farm-1",
        title: "SALUD & BIENESTAR FAMILIAR",
        highlight: "TU SALUD EN BUENAS MANOS",
        subtitle: "Amplio stock de medicamentos, vitaminas y suplementos con garantía de calidad.",
        badge: "GARANTIZADO",
        image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=1800&auto=format&fit=crop",
        ctaText: "Ver Productos",
      },
      {
        id: "banner-farm-2",
        title: "CUIDADO PERSONAL & DERMOCOSMÉTICA",
        highlight: "LÍNEAS ESPECIALIZADAS",
        subtitle: "Protección solar, hidratantes y tratamientos para cuidar tu piel y salud.",
        badge: "ORIGINALES",
        image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=1800&auto=format&fit=crop",
        ctaText: "Explorar Línea",
      },
    ],
    lookbookTitle: "Líneas de Cuidado & Bienestar",
    lookbookSubtitle: "Cuidado preventivo, suplementación y productos para el bienestar de toda tu familia.",
    lookbookItems: [
      {
        id: "look-f1",
        title: "Cuidado Infantil & Maternidad",
        subtitle: "Fórmulas, pañales y productos dermatológicos suaves.",
        tag: "BEBÉ & MAMÁ",
        image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?q=80&w=800&auto=format&fit=crop",
      },
      {
        id: "look-f2",
        title: "Vitaminas & Suplementos",
        subtitle: "Refuerza tus defensas y energía diaria.",
        tag: "ENERGÍA",
        image: "https://images.unsplash.com/photo-1550572017-ed2a0f542345?q=80&w=800&auto=format&fit=crop",
      },
      {
        id: "look-f3",
        title: "Higiene & Primeros Auxilios",
        subtitle: "Material médico, botiquín y desinfección.",
        tag: "ESENCIAL",
        image: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?q=80&w=800&auto=format&fit=crop",
      },
    ],
    showcaseRailTitle: "Líneas Farmacéuticas & Salud",
    showcaseRailSubtitle: "Laboratorios de prestigio y productos respaldados",
    showcaseRailItems: [
      {
        id: "rail-f-1",
        brand: "SALUD",
        title: "Medicamentos de Marca",
        desc: "Tratamientos certificados con receta",
        img: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=600&auto=format&fit=crop",
      },
      {
        id: "rail-f-2",
        brand: "DERMO",
        title: "Dermocosmética",
        desc: "Protectores y cremas de alta gama",
        img: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=600&auto=format&fit=crop",
      },
    ],
    footerAbout: "Botica y farmacia comprometida con tu salud. Medicamentos de laboratorios reconocidos y despacho rápido.",
  },

  FERRETERIA: {
    key: "FERRETERIA",
    label: "Ferretería, Materiales y Herramientas",
    icon: "🔨",
    variantLabel: "Medidas / Especificaciones",
    catalogBadge: "FERRETERÍA & HERRAMIENTAS",
    catalogTitle: "Catálogo de Materiales & Equipos",
    catalogSubtitle: "Herramientas eléctricas y manuales, gasfitería, electricidad y materiales de construcción resistentes.",
    announcement: "¡Cotizaciones inmediatas para obras y proyectos! Consulta descuentos por mayor.",
    tickerPhrases: [
      "HERRAMIENTAS PROFESIONALES CON GARANTÍA",
      "MATERIALES DE CONSTRUCCIÓN & GASFITERÍA",
      "ELECTRICIDAD E ILUMINACIÓN LED",
      "COTIZACIONES AL INSTANTE POR WHATSAPP",
      "DESPACHO A TALLER Y A OBRA",
    ],
    banners: [
      {
        id: "banner-ferr-1",
        title: "HERRAMIENTAS & EQUIPAMIENTO",
        highlight: "POTENCIA & DURABILIDAD",
        subtitle: "Equipos de alto rendimiento para carpintería, mecánica y construcción.",
        badge: "GARANTÍA REAL",
        image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?q=80&w=1800&auto=format&fit=crop",
        ctaText: "Ver Herramientas",
      },
      {
        id: "banner-ferr-2",
        title: "MATERIALES PARA PROYECTOS Y OBRAS",
        highlight: "TODO EN UN SOLO LUGAR",
        subtitle: "Tuberías, grifería, pernos, cables y pinturas de máxima resistencia.",
        badge: "PRECIOS DE PROVEEDOR",
        image: "https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?q=80&w=1800&auto=format&fit=crop",
        ctaText: "Ver Materiales",
      },
    ],
    lookbookTitle: "Líneas de Trabajo & Proyectos",
    lookbookSubtitle: "Equipos y suministros probados para el trabajo más exigente.",
    lookbookItems: [
      {
        id: "look-fe1",
        title: "Herramientas Eléctricas",
        subtitle: "Taladros, amoladoras y sierras de primeras marcas.",
        tag: "POTENCIA",
        image: "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?q=80&w=800&auto=format&fit=crop",
      },
      {
        id: "look-fe2",
        title: "Gasfitería & Plomería",
        subtitle: "Accesorios, llaves, pegamentos y tuberías de presión.",
        tag: "INSTALACIONES",
        image: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?q=80&w=800&auto=format&fit=crop",
      },
      {
        id: "look-fe3",
        title: "Pinturas & Acabados",
        subtitle: "Esmaltes, látex y selladores con alta cobertura.",
        tag: "ACABADOS",
        image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?q=80&w=800&auto=format&fit=crop",
      },
    ],
    showcaseRailTitle: "Líneas de Ferretería & Obra",
    showcaseRailSubtitle: "Herramientas y materiales de alta exigencia",
    showcaseRailItems: [
      {
        id: "rail-fe-1",
        brand: "ELÉCTRICAS",
        title: "Taladros & Amoladoras",
        desc: "Marcas profesionales de uso continuo",
        img: "https://images.unsplash.com/photo-1504148455328-c376907d081c?q=80&w=600&auto=format&fit=crop",
      },
      {
        id: "rail-fe-2",
        brand: "CONSTRUCCIÓN",
        title: "Materiales & Fijaciones",
        desc: "Pernos, clavos y cementos especiales",
        img: "https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?q=80&w=600&auto=format&fit=crop",
      },
    ],
    footerAbout: "Tu ferretería de confianza con asesoría técnica, repuestos y venta mayorista para tus proyectos.",
  },

  ABARROTES: {
    key: "ABARROTES",
    label: "Abarrotes, Minimarket y Alimentos",
    icon: "🛒",
    variantLabel: "Presentaciones / Pesos",
    catalogBadge: "MINIMARKET & ABARROTES",
    catalogTitle: "Catálogo de Productos & Despensa",
    catalogSubtitle: "Alimentos de primera necesidad, bebidas, lácteos, limpieza y confitería a precios convenientes.",
    announcement: "¡Haz tu pedido de la semana por WhatsApp! Entregas rápidas y productos frescos.",
    tickerPhrases: [
      "PRODUCTOS DE PRIMERA NECESIDAD & DESPENSA",
      "BEBIDAS, LÁCTEOS Y ALIMENTOS FRESCOS",
      "PRECIOS ECONÓMICOS POR UNIDAD Y CAJA",
      "ATENCIÓN Y REPARTO A DOMICILIO",
      "PEDIDOS SEGUROS POR WHATSAPP",
    ],
    banners: [
      {
        id: "banner-aba-1",
        title: "TU DESPENSA COMPLETA & AL MEJOR PRECIO",
        highlight: "TODO PARA EL HOGAR",
        subtitle: "Variedad en marcas de confianza, granos, aceites, lácteos y productos de limpieza.",
        badge: "PRECIOS BAJOS",
        image: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=1800&auto=format&fit=crop",
        ctaText: "Ver Productos",
      },
      {
        id: "banner-aba-2",
        title: "OFERTAS & COMBOS SEMANALES",
        highlight: "AHORRA EN CADA COMPRA",
        subtitle: "Lleva más pagando menos en tus marcas favoritas de consumo masivo.",
        badge: "OFERTAS",
        image: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1800&auto=format&fit=crop",
        ctaText: "Ver Ofertas",
      },
    ],
    lookbookTitle: "Categorías Destacadas",
    lookbookSubtitle: "Todo lo que necesitas para tu mesa y el cuidado del hogar.",
    lookbookItems: [
      {
        id: "look-ab1",
        title: "Despensa & No Perecibles",
        subtitle: "Arroz, menestras, fideos, aceites y conservas.",
        tag: "ESENCIALES",
        image: "https://images.unsplash.com/photo-1608686207856-001b95cf60ca?q=80&w=800&auto=format&fit=crop",
      },
      {
        id: "look-ab2",
        title: "Lácteos & Desayunos",
        subtitle: "Leches, quesos, avenas, cafés y cereales nutritivos.",
        tag: "DESAYUNOS",
        image: "https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?q=80&w=800&auto=format&fit=crop",
      },
      {
        id: "look-ab3",
        title: "Limpieza & Aseo del Hogar",
        subtitle: "Detergentes, desinfectantes y papel higiénico.",
        tag: "LIMPIEZA",
        image: "https://images.unsplash.com/photo-1585421514738-01798e348b17?q=80&w=800&auto=format&fit=crop",
      },
    ],
    showcaseRailTitle: "Líneas de Despensa & Consumo",
    showcaseRailSubtitle: "Alimentos y productos frescos con rotación garantizada",
    showcaseRailItems: [
      {
        id: "rail-a-1",
        brand: "DESPENSA",
        title: "Arroz & Granos",
        desc: "Sacos y empaques familiares",
        img: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=600&auto=format&fit=crop",
      },
      {
        id: "rail-a-2",
        brand: "LÁCTEOS",
        title: "Quesos & Yogures",
        desc: "Frescura diaria para tu familia",
        img: "https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?q=80&w=600&auto=format&fit=crop",
      },
    ],
    footerAbout: "Abastecemos tu negocio y hogar con productos de alta rotación, precios accesibles y servicio amable.",
  },

  TECNOLOGIA: {
    key: "TECNOLOGIA",
    label: "Tecnología, Móviles y Computación",
    icon: "📱",
    variantLabel: "Modelos / Almacenamiento",
    catalogBadge: "TECNOLOGÍA & ACCESORIOS",
    catalogTitle: "Catálogo de Dispositivos & Gadgets",
    catalogSubtitle: "Smartphones, laptops, periféricos, audio de alta fidelidad y accesorios con garantía comprobada.",
    announcement: "¡Equipos 100% originales con garantía! Consulta disponibilidad inmediata por WhatsApp.",
    tickerPhrases: [
      "EQUIPOS ORIGINALES CON GARANTÍA DE MARCA",
      "SMARTPHONES LIBERADOS Y ACCESORIOS",
      "AUDIO DE ALTA FIDELIDAD Y GADGETS",
      "ASESORÍA TÉCNICA Y SOPORTE",
      "ENVÍOS SEGUROS A NIVEL NACIONAL",
    ],
    banners: [
      {
        id: "banner-tec-1",
        title: "INNOVACIÓN & POTENCIA DIGITAL",
        highlight: "TECNOLOGÍA DE VANGUARDIA",
        subtitle: "Descubre los últimos lanzamientos en smartphones, audífonos y accesorios premium.",
        badge: "NUEVOS INGRESOS",
        image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1800&auto=format&fit=crop",
        ctaText: "Ver Dispositivos",
      },
      {
        id: "banner-tec-2",
        title: "ACCESORIOS & AUDIO PROFESIONAL",
        highlight: "SONIDO & CONECTIVIDAD",
        subtitle: "Cables certificados, cargadores rápidos y parlantes de alta fidelidad.",
        badge: "ACCESORIOS",
        image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1800&auto=format&fit=crop",
        ctaText: "Ver Accesorios",
      },
    ],
    lookbookTitle: "Líneas de Tecnología",
    lookbookSubtitle: "Dispositivos diseñados para maximizar tu productividad y entretenimiento.",
    lookbookItems: [
      {
        id: "look-t1",
        title: "Smartphones & Tablets",
        subtitle: "Equipos veloces con cámaras profesionales.",
        tag: "MÓVILES",
        image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=800&auto=format&fit=crop",
      },
      {
        id: "look-t2",
        title: "Audio & Auriculares",
        subtitle: "Cancelación de ruido activa y sonido envolvente.",
        tag: "AUDIO",
        image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?q=80&w=800&auto=format&fit=crop",
      },
      {
        id: "look-t3",
        title: "Periféricos & Cómputo",
        subtitle: "Teclados mecánicos, mouses gamer y hubs USB.",
        tag: "GAMING & WORK",
        image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?q=80&w=800&auto=format&fit=crop",
      },
    ],
    showcaseRailTitle: "Marcas & Ecosistemas Tecnológicos",
    showcaseRailSubtitle: "Dispositivos certificados con soporte oficial",
    showcaseRailItems: [
      {
        id: "rail-t-1",
        brand: "MÓVILES",
        title: "Smartphones 5G",
        desc: "Cámaras profesionales y procesadores veloces",
        img: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=600&auto=format&fit=crop",
      },
      {
        id: "rail-t-2",
        brand: "AUDIO",
        title: "Auriculares & Parlantes",
        desc: "Sonido envolvente sin cables",
        img: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?q=80&w=600&auto=format&fit=crop",
      },
    ],
    footerAbout: "Tu tienda de tecnología con productos originales, garantía transparente y envíos directos a todo el país.",
  },

  RESTAURANTE: {
    key: "RESTAURANTE",
    label: "Restaurante, Café y Gastronomía",
    icon: "🍽️",
    variantLabel: "Porciones / Platos",
    catalogBadge: "GASTRONOMÍA & ESPECIALIDADES",
    catalogTitle: "Nuestra Carta & Especialidades",
    catalogSubtitle: "Platos preparados al momento con ingredientes selectos, recetas de autor y sabor inolvidable.",
    announcement: "¡Delivery activo y reservas disponibles! Haz tu pedido directamente por WhatsApp.",
    tickerPhrases: [
      "PLATOS PREPARADOS AL INSTANTE CON INGREDIENTES FRESCOS",
      "RECETAS TRADICIONALES Y SABOR INIGUALABLE",
      "DELIVERY RÁPIDO Y EMPAQUES TÉRMICOS",
      "ATENCIÓN Y RESERVAS POR WHATSAPP",
      "HIGIENE Y PROTOCOLOS DE CALIDAD",
    ],
    banners: [
      {
        id: "banner-rest-1",
        title: "SABORES QUE CONQUISTAN TU PALADAR",
        highlight: "NUESTRA CARTA DE AUTOR",
        subtitle: "Disfruta de nuestras especialidades culinarias preparadas con pasión y excelencia.",
        badge: "ESPECIALIDAD",
        image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1800&auto=format&fit=crop",
        ctaText: "Ver Nuestra Carta",
      },
      {
        id: "banner-rest-2",
        title: "BEBIDAS & POSTRES ARTESANALES",
        highlight: "EL COMPLEMENTO PERFECTO",
        subtitle: "Cócteles de autor, jugos naturales y postres recién horneados.",
        badge: "POSTRES & BEBIDAS",
        image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1800&auto=format&fit=crop",
        ctaText: "Ver Especialidades",
      },
    ],
    lookbookTitle: "Especialidades de la Casa",
    lookbookSubtitle: "Platos emblemáticos que combinan tradición, técnica y frescura.",
    lookbookItems: [
      {
        id: "look-re1",
        title: "Platos Principales de Fondo",
        subtitle: "Carnes, pastas y recetas emblemáticas.",
        tag: "FONDOS",
        image: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=800&auto=format&fit=crop",
      },
      {
        id: "look-re2",
        title: "Entradas & Piques",
        subtitle: "Bocados deliciosos para compartir en mesa.",
        tag: "ENTRADAS",
        image: "https://images.unsplash.com/photo-1541544741938-0af808871cc0?q=80&w=800&auto=format&fit=crop",
      },
      {
        id: "look-re3",
        title: "Postres & Repostería",
        subtitle: "El toque dulce perfecto para cerrar tu experiencia.",
        tag: "DULCES",
        image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?q=80&w=800&auto=format&fit=crop",
      },
    ],
    showcaseRailTitle: "Nuestra Selección Culinaria",
    showcaseRailSubtitle: "Platos frescos elaborados con recetas tradicionales",
    showcaseRailItems: [
      {
        id: "rail-re-1",
        brand: "FONDOS",
        title: "Especialidades de Casa",
        desc: "Ingredientes selectos y cocción lenta",
        img: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=600&auto=format&fit=crop",
      },
      {
        id: "rail-re-2",
        brand: "POSTRES",
        title: "Dulces Artesanales",
        desc: "Recién preparados para tu mesa",
        img: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?q=80&w=600&auto=format&fit=crop",
      },
    ],
    footerAbout: "Pasión por la buena mesa. Ingredientes frescos, atención esmerada y delivery rápido hasta tu puerta.",
  },

  BELLEZA: {
    key: "BELLEZA",
    label: "Belleza, Cosméticos y Spa",
    icon: "💄",
    variantLabel: "Tonos / Presentaciones",
    catalogBadge: "BELLEZA & COSMÉTICA",
    catalogTitle: "Catálogo de Cosmética & Cuidado",
    catalogSubtitle: "Maquillaje profesional, skincare dermatológico, perfumes y cuidado capilar de alta gama.",
    announcement: "¡Productos originales y asesoría de belleza personalizada por WhatsApp!",
    tickerPhrases: [
      "PRODUCTOS DE BELLEZA 100% ORIGINALES",
      "LÍNEAS DE SKINCARE Y DERMOCOSMÉTICA",
      "MAQUILLAJE PROFESIONAL DE ALTA DURACIÓN",
      "ASESORÍA PERSONALIZADA EN RUTINAS",
      "ENVÍOS CUIDADOSOS A TODO EL PAÍS",
    ],
    banners: [
      {
        id: "banner-bel-1",
        title: "RESALTA TU BELLEZA NATURAL",
        highlight: "SKINCARE & MAQUILLAJE",
        subtitle: "Fórmulas certificadas que nutren, protegen y embellecen tu piel en cada rutina.",
        badge: "ALTA GAMA",
        image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1800&auto=format&fit=crop",
        ctaText: "Ver Cosméticos",
      },
      {
        id: "banner-bel-2",
        title: "CUIDADO CAPILAR & PERFUMERÍA",
        highlight: "AROMAS & BRILLO",
        subtitle: "Tratamientos intensivos y fragancias exclusivas para consentirte cada día.",
        badge: "DESTACADOS",
        image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=1800&auto=format&fit=crop",
        ctaText: "Ver Fragancias",
      },
    ],
    lookbookTitle: "Rutinas & Tendencias de Belleza",
    lookbookSubtitle: "Descubre los pasos clave para un cuidado integral de rostro, cabello y cuerpo.",
    lookbookItems: [
      {
        id: "look-b1",
        title: "Rutinas de Skincare",
        subtitle: "Limpieza, hidratación y sérums concentrados.",
        tag: "PIEL RADIANTE",
        image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?q=80&w=800&auto=format&fit=crop",
      },
      {
        id: "look-b2",
        title: "Maquillaje Social & Glamour",
        subtitle: "Bases de alta cobertura, labiales y sombras de impacto.",
        tag: "MAQUILLAJE",
        image: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?q=80&w=800&auto=format&fit=crop",
      },
      {
        id: "look-b3",
        title: "Perfumes & Fragancias",
        subtitle: "Aromas cautivadores con excelente fijación.",
        tag: "PERFUMES",
        image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?q=80&w=800&auto=format&fit=crop",
      },
    ],
    showcaseRailTitle: "Líneas de Belleza & Cuidado",
    showcaseRailSubtitle: "Marcas y fórmulas recomendadas para tu piel",
    showcaseRailItems: [
      {
        id: "rail-b-1",
        brand: "SKINCARE",
        title: "Tratamientos Faciales",
        desc: "Hidratación y protección antioxidante",
        img: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?q=80&w=600&auto=format&fit=crop",
      },
      {
        id: "rail-b-2",
        brand: "MAQUILLAJE",
        title: "Alta Cobertura",
        desc: "Pigmentos intensos de larga duración",
        img: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?q=80&w=600&auto=format&fit=crop",
      },
    ],
    footerAbout: "Tu espacio de belleza y cosmética de confianza con marcas prestigiosas y consejos personalizados.",
  },

  GENERAL: {
    key: "GENERAL",
    label: "Comercio General y Servicios",
    icon: "🛍️",
    variantLabel: "Variantes / Opciones",
    catalogBadge: "CATÁLOGO OFICIAL DE PRODUCTOS",
    catalogTitle: "Catálogo Oficial de Productos",
    catalogSubtitle: "Explora nuestra selección completa de artículos con garantía de calidad y atención directa.",
    announcement: "¡Bienvenidos a nuestro catálogo virtual! Realiza tus consultas y pedidos por WhatsApp.",
    tickerPhrases: [
      "CATÁLOGO OFICIAL Y PRODUCTOS VERIFICADOS",
      "GARANTÍA Y ATENCIÓN PERSONALIZADA",
      "PEDIDOS RÁPIDOS POR WHATSAPP",
      "PRECIOS TRANSPARENTES Y PROMOCIONES",
      "ENVÍOS SEGUROS A NIVEL NACIONAL",
    ],
    banners: [
      {
        id: "banner-gen-1",
        title: "CALIDAD, VARIEDAD & MEJOR PRECIO",
        highlight: "TODO EN NUESTRA TIENDA",
        subtitle: "Encuentra tus artículos favoritos con entrega rápida y respaldo garantizado.",
        badge: "DESTACADO",
        image: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=1800&auto=format&fit=crop",
        ctaText: "Ver Catálogo",
      },
      {
        id: "banner-gen-2",
        title: "ATENCIÓN DIRECTA & PERSONALIZADA",
        highlight: "ESTAMOS PARA SERVIRTE",
        subtitle: "Contáctanos para pedidos mayoristas, cotizaciones o consultas inmediatas.",
        badge: "CONFIANZA",
        image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1800&auto=format&fit=crop",
        ctaText: "Hacer Pedido",
      },
    ],
    lookbookTitle: "Líneas de Productos Destacados",
    lookbookSubtitle: "Selección especial para cubrir todas tus necesidades con máxima satisfacción.",
    lookbookItems: [
      {
        id: "look-g1",
        title: "Artículos Más Vendidos",
        subtitle: "Los preferidos por nuestros clientes con excelente calificación.",
        tag: "TOP VENTAS",
        image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=800&auto=format&fit=crop",
      },
      {
        id: "look-g2",
        title: "Novedades & Nuevos Ingresos",
        subtitle: "Productos recién incorporados a nuestro inventario.",
        tag: "NOVEDADES",
        image: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=800&auto=format&fit=crop",
      },
      {
        id: "look-g3",
        title: "Ofertas Especiales",
        subtitle: "Precios de promoción y combos por tiempo limitado.",
        tag: "OFERTAS",
        image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=800&auto=format&fit=crop",
      },
    ],
    showcaseRailTitle: "Líneas & Marcas Destacadas",
    showcaseRailSubtitle: "Nuestros productos y categorías más solicitadas",
    showcaseRailItems: [
      {
        id: "rail-g-1",
        brand: "DESTACADOS",
        title: "Más Vendidos",
        desc: "Calidad y preferencia de nuestros clientes",
        img: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=600&auto=format&fit=crop",
      },
      {
        id: "rail-g-2",
        brand: "NOVEDADES",
        title: "Lanzamientos 2026",
        desc: "Nuevas incorporaciones a nuestro catálogo",
        img: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=600&auto=format&fit=crop",
      },
    ],
    footerAbout: "Comprometidos con ofrecerte la mejor experiencia de compra, productos confiables y atención inmediata.",
  },
};

export function getRubroPreset(rubroString?: string | null): RubroPreset {
  if (!rubroString) return RUBRO_PRESETS.CALZADOS;
  const s = rubroString.toLowerCase();

  // Match Electrodomésticos first (including user's database value 'LECTRODOMESTICOS')
  if (
    s.includes("electro") ||
    s.includes("lectro") ||
    s.includes("refriger") ||
    s.includes("lavador") ||
    s.includes("congelad") ||
    s.includes("linea blanca") ||
    s.includes("cocina") ||
    s.includes("licuador")
  ) {
    return RUBRO_PRESETS.ELECTRODOMESTICOS;
  }

  if (s.includes("calzad") || s.includes("zapato") || s.includes("veaz") || s.includes("stiletto")) {
    return RUBRO_PRESETS.CALZADOS;
  }
  if (s.includes("ropa") || s.includes("boutique") || s.includes("moda") || s.includes("textil") || s.includes("confecc")) {
    return RUBRO_PRESETS.ROPA_MODA;
  }
  if (s.includes("farma") || s.includes("botic") || s.includes("salud") || s.includes("medic")) {
    return RUBRO_PRESETS.FARMACIA;
  }
  if (s.includes("ferret") || s.includes("construc") || s.includes("herramient") || s.includes("material")) {
    return RUBRO_PRESETS.FERRETERIA;
  }
  if (s.includes("abarrot") || s.includes("minimarket") || s.includes("bodeg") || s.includes("alimento")) {
    return RUBRO_PRESETS.ABARROTES;
  }
  if (s.includes("tecno") || s.includes("movil") || s.includes("celular") || s.includes("comput") || s.includes("laptop")) {
    return RUBRO_PRESETS.TECNOLOGIA;
  }
  if (s.includes("restauran") || s.includes("caf") || s.includes("gastronom") || s.includes("comida") || s.includes("poller")) {
    return RUBRO_PRESETS.RESTAURANTE;
  }
  if (s.includes("bellez") || s.includes("cosmet") || s.includes("spa") || s.includes("peluquer") || s.includes("makeup")) {
    return RUBRO_PRESETS.BELLEZA;
  }
  return RUBRO_PRESETS.GENERAL;
}

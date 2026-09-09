import { useRef } from "react";
import { motion } from "framer-motion";
import { Sparkles, ChevronLeft, ChevronRight, Eye, ArrowUpRight } from "lucide-react";
import { VeazCrownIcon } from "./VeazLogo";
import { VeazBrandLogo } from "./VeazBrandLogo";

export interface RunwayLook {
  id: string;
  brand: string;
  tag: string;
  season: string;
  title: string;
  outfit: string;
  shoeType: string;
  quote: string;
  image: string;
  filterBrand: string;
}

const RUNWAY_FULL_LOOKS: RunwayLook[] = [
  {
    id: "look-vizzano-black",
    brand: "VIZZANO",
    tag: "VIZZANO AUTORIZADO",
    season: "PASARELA ALTA COSTURA",
    title: "Stilettos Tacón Aguja & Vestido Cocktail",
    outfit: "Vestido midi estructurado con apertura lateral",
    shoeType: "Stilettos Tacón Aguja 10cm Negro & Oro",
    quote: "La silueta icónica de Vizzano que domina las semanas de la moda internacionales.",
    image:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop",
    filterBrand: "VIZZANO",
  },
  {
    id: "look-vizzano-red",
    brand: "VIZZANO",
    tag: "COLECCIÓN GALA ROJO",
    season: "PASARELA RED CARPET",
    title: "TACONES de Tiras Rojas & Vestido de Noche",
    outfit: "Vestido de gala satín con pedrería sutil",
    shoeType: "TACONES Altas Tiras Finas y Tobillera",
    quote: "Impacto absoluto y glamour con el característico rojo fuego de la casa.",
    image:
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1000&auto=format&fit=crop",
    filterBrand: "VIZZANO",
  },
  {
    id: "look-edwin-men",
    brand: "EDWIN",
    tag: "LÍNEA EDWIN VARONES",
    season: "PASARELA MASCULINA",
    title: "Zapatos Oxford Cuero Italiano & Traje de Etiqueta",
    outfit: "Traje sastre entallado en paño italiano y solapa de smoking",
    shoeType: "Zapatos de Vestir Brogues Pátina Artesanal",
    quote: "Excelencia y distinción en sastrería y calzado masculino para ocasiones solemnes.",
    image:
      "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?q=80&w=1000&auto=format&fit=crop",
    filterBrand: "EDWIN",
  },
  {
    id: "look-marimena-gala",
    brand: "MARIMENA",
    tag: "MARIMENA STRASS",
    season: "GALA & MATRIMONIOS",
    title: "TACONES Strass con Cristales & Traje de Fiesta",
    outfit: "Vestido largo en mikado de seda con destellos",
    shoeType: "TACONES Esculturales Taco Aguja con Strass",
    quote: "Brillo incomparable y calce perfecto para la noche más especial de tu vida.",
    image:
      "https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=1000&auto=format&fit=crop",
    filterBrand: "MARIMENA",
  },
  {
    id: "look-modare-confort",
    brand: "MODARE",
    tag: "MODARE ULTRA CONFORT",
    season: "PASARELA CONFORT CHIC",
    title: "Tacos Medios Anatómicos & Conjunto Vanguardista",
    outfit: "Sastrería contemporánea en tonos neutros y lino fino",
    shoeType: "Tacos Medios Ergonómicos con Plantilla Gel",
    quote: "La revolución de la comodidad: caminar en las nubes sin renunciar al estilo.",
    image:
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=1000&auto=format&fit=crop",
    filterBrand: "MODARE",
  },
  {
    id: "look-xiomara-autor",
    brand: "XIOMARA",
    tag: "XIOMARA CALZADOS FINOS",
    season: "DISEÑO DE AUTOR",
    title: "Modelos Calados Troquelados & Vestido Bohemio Chic",
    outfit: "Vestido vaporoso de autor con mangas con volumen",
    shoeType: "Tacos Calados con Cortes Láser Anatómicos",
    quote: "Artesanía troquelada única que aporta frescura y distinción a cada paso.",
    image:
      "https://images.unsplash.com/photo-1581044777550-4cfa60707c03?q=80&w=1000&auto=format&fit=crop",
    filterBrand: "XIOMARA",
  },
];

interface VeazModelGalleryProps {
  onSelectBrand?: (brand: string) => void;
  onSelectCategory?: (cat: string) => void;
}

export default function VeazModelGallery({
  onSelectBrand,
  onSelectCategory,
}: VeazModelGalleryProps) {
  const sliderRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (sliderRef.current) {
      const scrollAmount = direction === "left" ? -400 : 400;
      sliderRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const handleSelect = (look: RunwayLook) => {
    if (onSelectBrand) {
      onSelectBrand(look.filterBrand);
    } else if (onSelectCategory) {
      onSelectCategory(look.shoeType);
    }
  };

  return (
    <section className="py-20 w-full px-4 sm:px-8 lg:px-12 2xl:px-16 bg-gradient-to-b from-[#FAF8F5] via-[#FFFDF9] to-[#F5EFEB] border-t border-[#EDE2D4] relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/3 left-0 w-96 h-96 bg-amber-200/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-0 w-96 h-96 bg-rose-200/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full">
        {/* SECTION HEADER WITH SLIDER CONTROLS */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-amber-300 text-amber-900 text-xs font-cinzel font-bold uppercase tracking-[0.25em] mb-3 shadow-xs">
              <VeazCrownIcon size={14} />
              <span>PASARELA DE CALZADOS & OUTFITS DE ALTA GAMA</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <h2 className="font-playfair text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
              Modelos en{" "}
              <span className="bg-gradient-to-r from-amber-700 via-yellow-600 to-amber-800 bg-clip-text text-transparent">
                Pasarela de Alta Moda
              </span>
            </h2>
            <p className="font-outfit text-slate-600 text-sm sm:text-base mt-2 max-w-2xl font-normal">
              Prendas de alta costura combinadas con los calzados originales que distribuimos. Desliza hacia la izquierda o derecha para ver todas las marcas autorizadas.
            </p>
          </div>

          {/* INTERACTIVE CAROUSEL CONTROLS (MOVE LEFT / RIGHT) */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-cinzel font-bold text-slate-500 uppercase tracking-widest hidden sm:inline">
              Deslizar Marcas:
            </span>
            <button
              type="button"
              onClick={() => scroll("left")}
              className="w-11 h-11 rounded-2xl bg-white border border-slate-200 text-slate-800 hover:bg-slate-900 hover:text-white hover:border-slate-900 flex items-center justify-center transition-all shadow-xs hover:shadow-md cursor-pointer active:scale-95"
              title="Ver anteriores"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              className="w-11 h-11 rounded-2xl bg-white border border-slate-200 text-slate-800 hover:bg-slate-900 hover:text-white hover:border-slate-900 flex items-center justify-center transition-all shadow-xs hover:shadow-md cursor-pointer active:scale-95"
              title="Ver siguientes"
              aria-label="Siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* HORIZONTAL CAROUSEL WITH SMOOTH SNAP & HOVER REVEAL */}
        <div
          ref={sliderRef}
          className="flex gap-5 sm:gap-6 overflow-x-auto pb-6 pt-2 snap-x snap-mandatory scrollbar-none scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {RUNWAY_FULL_LOOKS.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: index * 0.06 }}
              className="group shrink-0 w-[290px] sm:w-[340px] snap-start relative rounded-3xl overflow-hidden bg-white border border-[#EDE2D4] hover:border-amber-400 transition-all duration-400 flex flex-col h-[520px] shadow-sm hover:shadow-xl hover:-translate-y-1"
            >
              {/* FULL BODY RUNWAY IMAGE */}
              <div
                className="relative w-full h-[66%] overflow-hidden bg-slate-900 cursor-pointer"
                onClick={() => handleSelect(item)}
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-106"
                  loading="lazy"
                />

                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-black/20 to-transparent" />

                {/* Top Brand Logo */}
                <div className="absolute top-3.5 left-3.5 z-10 pointer-events-none">
                  <VeazBrandLogo brandName={item.brand} size="sm" showTagline={false} />
                </div>

                {/* Season Tag */}
                <div className="absolute top-3.5 right-3.5 z-10 pointer-events-none">
                  <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[9px] font-cinzel font-bold text-amber-200 border border-white/20 uppercase tracking-wider">
                    {item.season}
                  </span>
                </div>

                {/* Shoe Tag Badge (Bottom Left) */}
                <div className="absolute bottom-3 left-3 right-14 z-10 pointer-events-none">
                  <span className="inline-block px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur-md text-[10px] font-outfit font-bold text-slate-900 border border-white shadow-xs truncate max-w-full">
                    👠 {item.shoeType}
                  </span>
                </div>

                {/* Click Filter Button (Bottom Right) */}
                <div className="absolute bottom-3 right-3 z-10">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(item);
                    }}
                    className="w-9 h-9 rounded-full bg-white text-slate-900 border border-amber-300 flex items-center justify-center hover:bg-slate-950 hover:text-amber-300 hover:scale-110 active:scale-95 transition-all shadow-md cursor-pointer"
                    title={`Ver calzados de ${item.brand}`}
                  >
                    <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>

              {/* DETAILS FOOTER */}
              <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between bg-white">
                <div>
                  <h3
                    onClick={() => handleSelect(item)}
                    className="font-playfair text-base sm:text-lg font-bold text-slate-900 group-hover:text-amber-800 transition-colors line-clamp-1 cursor-pointer mb-1"
                  >
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-500 font-outfit line-clamp-1 mb-1">
                    <strong>Outfit:</strong> {item.outfit}
                  </p>

                  <p className="text-xs text-slate-600 font-outfit italic line-clamp-2">
                    "{item.quote}"
                  </p>
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-cinzel font-bold text-slate-700 uppercase tracking-wider">
                    Colección {item.brand}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSelect(item)}
                    className="text-[11px] font-cinzel font-bold text-amber-800 flex items-center gap-1 hover:text-amber-600 hover:underline cursor-pointer"
                  >
                    <span>Ver Modelos</span>
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

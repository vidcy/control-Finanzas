import type { GroupedShoeModel } from "../components/veaz/veazTypes";

// Curated high-resolution editorial model visuals for brand banners
const BRAND_EDITORIAL_MODELS: Record<string, { modelUrl: string; tagline: string; description: string }> = {
  VIZZANO: {
    modelUrl: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=800&auto=format&fit=crop",
    tagline: "HAUTE COUTURE & GLAMOUR INTERNACIONAL",
    description: "Diseño refinado, tacos aguja y stilettos con acabados de pasarela mundial.",
  },
  MODARE: {
    modelUrl: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?q=80&w=800&auto=format&fit=crop",
    tagline: "ULTRA CONFORT & ANATÓMICO ELEGANTE",
    description: "Plantillas suaves, tacos de descanso y confort absoluto en cada pisada.",
  },
  EDWIN: {
    modelUrl: "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?q=80&w=800&auto=format&fit=crop",
    tagline: "LÍNEA CABALLEROS & CALZADO DE VESTIR",
    description: "Cueros seleccionados, elegancia formal y estilo ejecutivo distinguido.",
  },
  MARIMENA: {
    modelUrl: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=800&auto=format&fit=crop",
    tagline: "ALTA GALA, STRASS & RED CARPET",
    description: "Tacos de fiesta, TACONES finas y diseños deslumbrantes para eventos de gala.",
  },
  XIOMARA: {
    modelUrl: "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=800&auto=format&fit=crop",
    tagline: "TENDENCIA, FRESCURA & DISTINCIÓN",
    description: "Colecciones modernas con detalles únicos, tacones confort y estilo juvenil chic.",
  },
  TRIKCS: {
    modelUrl: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=800&auto=format&fit=crop",
    tagline: "DISEÑO URBANO & CALIDAD PREMIUM",
    description: "Calzados anatómicos, resistentes y con la mejor confección de fábrica.",
  },
};

const DEFAULT_EDITORIAL = {
  modelUrl: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=800&auto=format&fit=crop",
  tagline: "DISTRIBUCIÓN AUTORIZADA OFICIAL",
  description: "Calzados finos con series originales y garantía total de autenticidad.",
};

/**
 * Robustly fetch image as blob and convert to Base64 data URL.
 * Bypasses tainted canvas and browser CORS cache collisions completely.
 */
async function getBase64ImageFromUrl(imageUrl: string): Promise<string | null> {
  if (!imageUrl) return null;

  try {
    // 1. Direct fetch as blob (DigitalOcean Spaces supports access-control-allow-origin: *)
    const res = await fetch(imageUrl, { mode: "cors" });
    if (res.ok) {
      const blob = await res.blob();
      return await new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    }
  } catch {
    // Continue to fallback
  }

  // 2. Offscreen Canvas fallback with cache-busting
  return new Promise<string | null>((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      let resolved = false;

      const finish = (result: string | null) => {
        if (!resolved) {
          resolved = true;
          resolve(result);
        }
      };

      const timer = setTimeout(() => finish(null), 3500);

      img.onload = () => {
        clearTimeout(timer);
        try {
          const canvas = document.createElement("canvas");
          const size = 500;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (!ctx) return finish(null);

          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, size, size);

          const aspect = (img.naturalWidth || 1) / (img.naturalHeight || 1);
          let w = size;
          let h = size;
          let dx = 0;
          let dy = 0;

          if (aspect > 1) {
            h = size / aspect;
            dy = (size - h) / 2;
          } else {
            w = size * aspect;
            dx = (size - w) / 2;
          }

          ctx.drawImage(img, dx, dy, w, h);
          const dataURL = canvas.toDataURL("image/jpeg", 0.88);
          finish(dataURL);
        } catch {
          finish(null);
        }
      };

      img.onerror = () => {
        clearTimeout(timer);
        finish(null);
      };

      img.src = imageUrl;
    } catch {
      resolve(null);
    }
  });
}

/**
 * Generate a luxury Haute Couture Editorial Lookbook PDF
 * Organized strictly by Brand with editorial model presentation headers and 2x2 shoe cards.
 */
export async function exportCatalogToPdf(
  products: GroupedShoeModel[],
  _options?: {
    brandFilter?: string;
    familyFilter?: string;
  }
): Promise<void> {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  // Palette
  const darkNavy = [11, 15, 25]; // #0B0F19
  const royalNavy = [18, 26, 43]; // #121A2B
  const goldAmber = [202, 138, 4]; // #CA8A04
  const warmGold = [234, 179, 8]; // #EAB308
  const softBg = [253, 251, 247]; // #FDFBF7
  const borderCol = [237, 226, 212]; // #EDE2D4
  const slateDark = [30, 41, 59]; // #1E293B
  const slateMuted = [100, 116, 139]; // #64748B
  const roseOffer = [225, 29, 72]; // #E11D48

  // Pre-load all Base64 product images in parallel
  const base64Images: Record<string, string | null> = {};
  await Promise.all(
    products.map(async (p) => {
      const url =
        p.imageUrl ||
        "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=600&auto=format&fit=crop";
      base64Images[p.key] = await getBase64ImageFromUrl(url);
    })
  );

  // Group products by Brand
  const brandGroups = new Map<string, GroupedShoeModel[]>();
  products.forEach((p) => {
    const bName = (p.brandName || "VEAZ ESTILEZA").trim().toUpperCase();
    if (!brandGroups.has(bName)) {
      brandGroups.set(bName, []);
    }
    brandGroups.get(bName)!.push(p);
  });

  // Pre-load Brand Model Editorial Images
  const brandEditorialImages: Record<string, string | null> = {};
  await Promise.all(
    Array.from(brandGroups.keys()).map(async (bName) => {
      const info = BRAND_EDITORIAL_MODELS[bName] || DEFAULT_EDITORIAL;
      brandEditorialImages[bName] = await getBase64ImageFromUrl(info.modelUrl);
    })
  );

  // ════════════════════════════════════════════════════════════════
  // 1. EDITORIAL COVER PAGE (PORTADA DE LUJO)
  // ════════════════════════════════════════════════════════════════
  // Dark luxury background
  doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Elegant gold frame lines
  doc.setDrawColor(goldAmber[0], goldAmber[1], goldAmber[2]);
  doc.setLineWidth(0.8);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
  doc.setLineWidth(0.3);
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

  // Top Crown Monogram
  doc.setFont("times", "bold");
  doc.setFontSize(28);
  doc.setTextColor(warmGold[0], warmGold[1], warmGold[2]);
  doc.text("👑", pageWidth / 2, 42, { align: "center" });

  // Main Brand Title
  doc.setFont("times", "bold");
  doc.setFontSize(32);
  doc.setTextColor(255, 255, 255);
  doc.text("VEAZ ESTILEZA", pageWidth / 2, 60, { align: "center" });

  // Gold separator bar
  doc.setFillColor(warmGold[0], warmGold[1], warmGold[2]);
  doc.rect(pageWidth / 2 - 25, 66, 50, 1.2, "F");

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(warmGold[0], warmGold[1], warmGold[2]);
  doc.text("LOOKBOOK EDITORIAL · CATÁLOGO OFICIAL 2026", pageWidth / 2, 74, { align: "center" });

  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text("ALTA COSTURA EN CALZADOS DE DAMA, TACOS, STILETTOS & TACONES", pageWidth / 2, 80, { align: "center" });

  // Central Editorial Visual Box
  const coverImg = brandEditorialImages["VIZZANO"] || brandEditorialImages["MARIMENA"];
  if (coverImg) {
    try {
      const imgW = 110;
      const imgH = 110;
      const imgX = (pageWidth - imgW) / 2;
      const imgY = 92;
      doc.addImage(coverImg, "JPEG", imgX, imgY, imgW, imgH);
      doc.setDrawColor(warmGold[0], warmGold[1], warmGold[2]);
      doc.setLineWidth(0.5);
      doc.rect(imgX, imgY, imgW, imgH);
    } catch (_) { }
  }

  // Brands Showcase Pills on Cover
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(warmGold[0], warmGold[1], warmGold[2]);
  doc.text("MARCAS AUTORIZADAS EN ESTA EDICIÓN:", pageWidth / 2, 218, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  const brandListStr = Array.from(brandGroups.keys()).join("   ·   ");
  doc.text(brandListStr, pageWidth / 2, 225, { align: "center" });

  // Cover Footer & Contact Card
  doc.setFillColor(royalNavy[0], royalNavy[1], royalNavy[2]);
  doc.roundedRect(24, 240, pageWidth - 48, 36, 3, 3, "F");
  doc.setDrawColor(goldAmber[0], goldAmber[1], goldAmber[2]);
  doc.roundedRect(24, 240, pageWidth - 48, 36, 3, 3, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(warmGold[0], warmGold[1], warmGold[2]);
  doc.text("ATENCIÓN EXCLUSIVA & PEDIDOS MAYORISTAS / MINORISTAS", pageWidth / 2, 249, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(241, 245, 249);
  doc.text("WhatsApp Oficial: +51 929 962 458   ·   Correo: beas.estileza@gmail.com", pageWidth / 2, 256, { align: "center" });
  doc.text("Envíos certificados a todo el Perú   ·   Series consolidadas con stock de fábrica", pageWidth / 2, 262, { align: "center" });
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Edición expedida el ${new Date().toLocaleDateString("es-PE")} · Todos los derechos reservados`, pageWidth / 2, 269, { align: "center" });

  // ════════════════════════════════════════════════════════════════
  // 2. BRAND SECTIONS (ORGANIZADO ESTRICTAMENTE POR MARCA)
  // ════════════════════════════════════════════════════════════════
  const renderPageHeaderAndFooter = (brandName: string) => {
    // Header banner
    doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.rect(0, 0, pageWidth, 22, "F");

    doc.setFillColor(goldAmber[0], goldAmber[1], goldAmber[2]);
    doc.rect(0, 21.5, pageWidth, 1, "F");

    // Title
    doc.setFont("times", "bold");
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text("VEAZ ESTILEZA", margin, 11);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(warmGold[0], warmGold[1], warmGold[2]);
    doc.text(`COLECCIÓN OFICIAL · LÍNEA ${brandName.toUpperCase()}`, margin, 17);

    // Header Right
    doc.setFontSize(7.5);
    doc.setTextColor(241, 245, 249);
    doc.text("WhatsApp: +51 929 962 458", pageWidth - margin, 11, { align: "right" });
    doc.setTextColor(148, 163, 184);
    doc.text("Series por tallas con stock real", pageWidth - margin, 17, { align: "right" });

    // Page Bottom Footer
    doc.setFillColor(softBg[0], softBg[1], softBg[2]);
    doc.rect(0, pageHeight - 11, pageWidth, 11, "F");
    doc.setDrawColor(borderCol[0], borderCol[1], borderCol[2]);
    doc.line(0, pageHeight - 11, pageWidth, pageHeight - 11);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text("VEAZ ESTILEZA © Calzados 100% originales con garantía y series completas", margin, pageHeight - 4.5);
  };

  // Process Each Brand
  for (const [brandName, brandShoes] of brandGroups.entries()) {
    // Brand Editorial Info
    const editorial = BRAND_EDITORIAL_MODELS[brandName] || DEFAULT_EDITORIAL;
    const modelImgBase64 = brandEditorialImages[brandName];

    // Card dimensions: 2x2 grid per page (4 shoes per page max for airy, luxury presentation)
    const cardWidth = (contentWidth - 8) / 2; // 87mm
    const cardHeight = 104; // 104mm
    const maxCardsPerPage = 4;

    let shoeIndex = 0;

    while (shoeIndex < brandShoes.length) {
      doc.addPage();
      renderPageHeaderAndFooter(brandName);

      let currentY = 27;

      // If it's the first page of this brand, draw the EDITORIAL BRAND SEPARATOR BANNER
      if (shoeIndex === 0) {
        doc.setFillColor(royalNavy[0], royalNavy[1], royalNavy[2]);
        doc.roundedRect(margin, currentY, contentWidth, 24, 2.5, 2.5, "F");
        doc.setDrawColor(goldAmber[0], goldAmber[1], goldAmber[2]);
        doc.setLineWidth(0.4);
        doc.roundedRect(margin, currentY, contentWidth, 24, 2.5, 2.5, "S");

        // Brand Name in Gold
        doc.setFont("times", "bold");
        doc.setFontSize(15);
        doc.setTextColor(warmGold[0], warmGold[1], warmGold[2]);
        doc.text(brandName.toUpperCase(), margin + 6, currentY + 8);

        // Tagline & Description
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.text(editorial.tagline, margin + 6, currentY + 14);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(203, 213, 225);
        doc.text(editorial.description, margin + 6, currentY + 19.5);

        // Right side: Editorial model photo of this brand
        const modelBoxSize = 21;
        const modelBoxX = pageWidth - margin - modelBoxSize - 2;
        const modelBoxY = currentY + 1.5;
        if (modelImgBase64) {
          try {
            doc.addImage(modelImgBase64, "JPEG", modelBoxX, modelBoxY, modelBoxSize, modelBoxSize);
            doc.setDrawColor(warmGold[0], warmGold[1], warmGold[2]);
            doc.setLineWidth(0.4);
            doc.rect(modelBoxX, modelBoxY, modelBoxSize, modelBoxSize);
          } catch (_) { }
        } else {
          doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2]);
          doc.roundedRect(pageWidth - margin - 52, currentY + 5, 48, 14, 2, 2, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(6.5);
          doc.setTextColor(warmGold[0], warmGold[1], warmGold[2]);
          doc.text("DISTRIBUIDOR OFICIAL", pageWidth - margin - 28, currentY + 11, { align: "center" });
          doc.setFont("helvetica", "normal");
          doc.setFontSize(6);
          doc.setTextColor(255, 255, 255);
          doc.text(`${brandShoes.length} modelos en serie`, pageWidth - margin - 28, currentY + 15.5, { align: "center" });
        }

        currentY += 28;
      }

      // Render up to 4 shoe cards on this page (or 2 if first page had big banner)
      // When first page has brand banner, 2 cards fit comfortably (1 row). On next pages, 4 cards fit (2 rows).
      const cardsFitOnThisPage = shoeIndex === 0 ? 2 : maxCardsPerPage;
      const pageShoes = brandShoes.slice(shoeIndex, shoeIndex + cardsFitOnThisPage);

      for (let c = 0; c < pageShoes.length; c++) {
        const shoe = pageShoes[c];
        const col = c % 2;
        const row = Math.floor(c / 2);

        const cardX = margin + col * (cardWidth + 8);
        const cardY = currentY + row * (cardHeight + 8);

        // Card Outer Box
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(borderCol[0], borderCol[1], borderCol[2]);
        doc.setLineWidth(0.4);
        doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 3, 3, "FD");

        // Top Shoe Image Container (81mm x 48mm)
        const imgBoxW = cardWidth - 6;
        const imgBoxH = 48;
        const imgBoxX = cardX + 3;
        const imgBoxY = cardY + 3;

        doc.setFillColor(softBg[0], softBg[1], softBg[2]);
        doc.roundedRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH, 2, 2, "F");

        const shoeBase64 = base64Images[shoe.key];
        if (shoeBase64) {
          try {
            doc.addImage(shoeBase64, "JPEG", imgBoxX + 1, imgBoxY + 1, imgBoxW - 2, imgBoxH - 2);
          } catch {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
            doc.text("CALZADO VEAZ", imgBoxX + imgBoxW / 2, imgBoxY + 24, { align: "center" });
          }
        } else {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
          doc.text("VEAZ ESTILEZA", imgBoxX + imgBoxW / 2, imgBoxY + 24, { align: "center" });
        }

        // Details Section
        let dY = imgBoxY + imgBoxH + 4;

        // Brand Pill & Heel Height
        doc.setFillColor(royalNavy[0], royalNavy[1], royalNavy[2]);
        doc.roundedRect(cardX + 4, dY, 28, 4.5, 1, 1, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(warmGold[0], warmGold[1], warmGold[2]);
        doc.text(shoe.brandName.slice(0, 15).toUpperCase(), cardX + 6, dY + 3.2);

        if (shoe.heelHeight) {
          doc.setFillColor(241, 245, 249);
          doc.roundedRect(cardX + 35, dY, 26, 4.5, 1, 1, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(6);
          doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
          doc.text(`Taco: ${shoe.heelHeight.replace(/Taco/i, "").trim()}`, cardX + 37, dY + 3.2);
        }

        dY += 8;

        // Model Name
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
        const splitName = doc.splitTextToSize(shoe.name, cardWidth - 8);
        doc.text(splitName[0] || shoe.name, cardX + 4, dY);

        dY += 4.5;

        // Color & SKU
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
        const colorLabel = shoe.color ? `Color: ${shoe.color}` : "Color: Especial";
        const skuLabel = shoe.sku ? `SKU: ${shoe.sku}` : "";
        doc.text(`${colorLabel}${skuLabel ? `  ·  ${skuLabel}` : ""}`, cardX + 4, dY);

        dY += 5;

        // Series Sizes Breakdown
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
        doc.text("Tallas en serie:", cardX + 4, dY);

        dY += 3.8;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
        const seriesStr = shoe.variants.map((v) => `T${v.size}(${v.stock})`).join(" · ");
        const splitSeries = doc.splitTextToSize(seriesStr || "Tallas disponibles en almacén", cardWidth - 8);
        doc.text(splitSeries[0] || seriesStr, cardX + 4, dY);

        dY += 4.5;
        doc.setFontSize(6.5);
        doc.setTextColor(5, 150, 105); // emerald-600
        doc.text(`✓ ${shoe.totalStock} pares listos para despacho`, cardX + 4, dY);

        // Price Card at bottom of card
        const priceBoxY = cardY + cardHeight - 16;
        const priceBoxW = cardWidth - 8;

        doc.setFillColor(softBg[0], softBg[1], softBg[2]);
        doc.setDrawColor(borderCol[0], borderCol[1], borderCol[2]);
        doc.roundedRect(cardX + 4, priceBoxY, priceBoxW, 12, 1.5, 1.5, "FD");

        if (shoe.hasOffer && shoe.adjustedPrice && shoe.adjustedPrice > 0) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.setTextColor(roseOffer[0], roseOffer[1], roseOffer[2]);
          doc.text(`S/ ${shoe.adjustedPrice.toFixed(2)}`, cardX + 7, priceBoxY + 5.5);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(6.5);
          doc.setTextColor(148, 163, 184);
          doc.text(`Antes: S/ ${shoe.minPrice.toFixed(2)}`, cardX + 7, priceBoxY + 9.8);

          // Offer badge
          doc.setFillColor(roseOffer[0], roseOffer[1], roseOffer[2]);
          doc.roundedRect(cardX + priceBoxW - 20, priceBoxY + 3, 20, 6, 1, 1, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(5.5);
          doc.setTextColor(255, 255, 255);
          doc.text("¡OFERTA!", cardX + priceBoxW - 10, priceBoxY + 7.2, { align: "center" });
        } else {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.setTextColor(royalNavy[0], royalNavy[1], royalNavy[2]);
          doc.text(`S/ ${shoe.minPrice.toFixed(2)}`, cardX + 7, priceBoxY + 7.5);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(6.5);
          doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
          doc.text("Garantía de Fábrica", cardX + priceBoxW - 2, priceBoxY + 7.5, { align: "right" });
        }
      }

      shoeIndex += cardsFitOnThisPage;
    }
  }

  // ════════════════════════════════════════════════════════════════
  // 3. BACK COVER PAGE (CONTRAPORTADA DE CIERRE)
  // ════════════════════════════════════════════════════════════════
  doc.addPage();
  doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Elegant gold frame
  doc.setDrawColor(goldAmber[0], goldAmber[1], goldAmber[2]);
  doc.setLineWidth(0.8);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
  doc.setLineWidth(0.3);
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

  // Logo
  doc.setFont("times", "bold");
  doc.setFontSize(28);
  doc.setTextColor(warmGold[0], warmGold[1], warmGold[2]);
  doc.text("👑", pageWidth / 2, 50, { align: "center" });

  doc.setFont("times", "bold");
  doc.setFontSize(30);
  doc.setTextColor(255, 255, 255);
  doc.text("VEAZ ESTILEZA", pageWidth / 2, 68, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(warmGold[0], warmGold[1], warmGold[2]);
  doc.text("DONDE LA ELEGANCIA SE CORONA", pageWidth / 2, 77, { align: "center" });

  // Center Statement Box
  doc.setFillColor(royalNavy[0], royalNavy[1], royalNavy[2]);
  doc.roundedRect(25, 96, pageWidth - 50, 70, 3, 3, "F");
  doc.setDrawColor(goldAmber[0], goldAmber[1], goldAmber[2]);
  doc.roundedRect(25, 96, pageWidth - 50, 70, 3, 3, "S");

  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor(warmGold[0], warmGold[1], warmGold[2]);
  doc.text("CALIDAD, EXCLUSIVIDAD Y CONFIANZA", pageWidth / 2, 114, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(241, 245, 249);
  doc.text("Cada calzado de nuestro catálogo es minuciosamente seleccionado bajo los más", pageWidth / 2, 126, { align: "center" });
  doc.text("estrictos estándares de comodidad, diseño ergonómico y acabados de lujo.", pageWidth / 2, 132, { align: "center" });
  doc.text("Disponemos de series completas por tallas para abastecer su boutique", pageWidth / 2, 142, { align: "center" });
  doc.text("o complementar su guardarropa con piezas auténticas de pasarela.", pageWidth / 2, 148, { align: "center" });

  // Channels
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(warmGold[0], warmGold[1], warmGold[2]);
  doc.text("CANALES DE ATENCIÓN DIRECTA", pageWidth / 2, 185, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("WhatsApp Pedidos: +51 929 962 458", pageWidth / 2, 196, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text("Correo de Ventas: beas.estileza@gmail.com", pageWidth / 2, 203, { align: "center" });
  doc.text("Horario de Atención: Domingo a Lunes de 8:00 am a 8:30 pm", pageWidth / 2, 210, { align: "center" });
  doc.text("Envíos express a todo el territorio peruano con seguro de carga", pageWidth / 2, 217, { align: "center" });

  // Bottom Branding
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("VEAZ ESTILEZA es una marca registrada operada bajo la infraestructura de Global Ccoplex.", pageWidth / 2, 256, { align: "center" });
  doc.text("Sincronizado en tiempo real con el software financiero THINK ERP.", pageWidth / 2, 262, { align: "center" });

  // Number all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 2; p < totalPages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text(`Página ${p} de ${totalPages}`, pageWidth - margin, pageHeight - 4.5, { align: "right" });
  }

  // Save PDF
  const filename = `Catalogo-VEAZ-ESTILEZA-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

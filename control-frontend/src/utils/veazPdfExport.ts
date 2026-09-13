import type { GroupedShoeModel } from "../components/veaz/veazTypes";

// Banco de frases editoriales de alta costura para rotación dinámica por marca
const EDITORIAL_QUOTES = [
  "Donde el glamour, la altura y la elegancia se encuentran en cada paso.",
  "Diseñado para mujeres que dominan el arte de dejar huella.",
  "Sofisticación absoluta, tacos finos y acabados de pasarela mundial.",
  "El lujo en tus pies: confort anatómico y estilo deslumbrante.",
  "Pasos firmes, diseños exclusivos y la distinción que mereces.",
  "La perfección del calzado fino para realzar tu presencia en cada evento."
];

/**
 * Generador algorítmico dinámico de paletas de color de lujo para CUALQUIER marca de la Base de Datos.
 */
function getDynamicBrandTheme(brandName: string): { primary: number[]; secondary: number[]; accent: number[]; badgeBg: number[] } {
  const luxuryPalettes = [
    { primary: [30, 27, 75], secondary: [79, 70, 229], accent: [129, 140, 248], badgeBg: [238, 242, 255] }, // Azul Zafiro / Royal
    { primary: [88, 28, 135], secondary: [126, 34, 206], accent: [168, 85, 247], badgeBg: [243, 232, 255] }, // Púrpura Amatista / Chic
    { primary: [136, 19, 55], secondary: [190, 24, 93], accent: [244, 63, 94], badgeBg: [255, 228, 230] }, // Rosa Burgundy / Gala
    { primary: [15, 23, 42], secondary: [180, 83, 9], accent: [217, 119, 6], badgeBg: [254, 243, 199] },   // Azul Noche & Dorado Lujo
    { primary: [6, 95, 70], secondary: [13, 148, 136], accent: [20, 184, 166], badgeBg: [240, 253, 250] },   // Esmeralda & Confort
    { primary: [120, 53, 15], secondary: [180, 83, 9], accent: [245, 158, 11], badgeBg: [254, 243, 199] },   // Cobre & Bronce Urbano
    { primary: [30, 41, 59], secondary: [51, 65, 85], accent: [96, 165, 250], badgeBg: [241, 245, 249] },     // Acero Ejecutivo / Caballero
  ];

  let hash = 0;
  const cleanName = (brandName || "VEAZ").trim().toUpperCase();
  for (let i = 0; i < cleanName.length; i++) {
    hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % luxuryPalettes.length;
  return luxuryPalettes[index];
}

/**
 * Frase aleatoria dinámica para la marca basada en su nombre
 */
function getDynamicQuote(brandName: string, index: number): string {
  let hash = 0;
  const cleanName = (brandName || "VEAZ").trim().toUpperCase();
  for (let i = 0; i < cleanName.length; i++) {
    hash = cleanName.charCodeAt(i) + ((hash << 3) - hash);
  }
  return EDITORIAL_QUOTES[(Math.abs(hash) + index) % EDITORIAL_QUOTES.length];
}

/**
 * Procesa la imagen preservando la relación de aspecto natural exacta (Object-Fit Contain).
 */
async function getBase64ImageFromUrl(imageUrl: string): Promise<{ dataUrl: string | null; aspect: number }> {
  if (!imageUrl) return { dataUrl: null, aspect: 1 };

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      let resolved = false;

      const finish = (result: string | null, aspect: number) => {
        if (!resolved) {
          resolved = true;
          resolve({ dataUrl: result, aspect });
        }
      };

      const timer = setTimeout(() => finish(null, 1), 4500);

      img.onload = () => {
        clearTimeout(timer);
        try {
          const naturalW = img.naturalWidth || 800;
          const naturalH = img.naturalHeight || 800;
          const aspect = naturalW / naturalH;

          const canvas = document.createElement("canvas");
          const size = 1000;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (!ctx) return finish(null, aspect);

          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, size, size);

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
          finish(canvas.toDataURL("image/jpeg", 0.96), aspect);
        } catch {
          finish(null, 1);
        }
      };

      img.onerror = () => {
        clearTimeout(timer);
        finish(null, 1);
      };

      img.src = imageUrl;
    } catch {
      resolve({ dataUrl: null, aspect: 1 });
    }
  });
}

/**
 * Genera el Catálogo PDF de Lujo con protección estricta anti-deformación de imágenes.
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
  const margin = 12;
  const contentWidth = pageWidth - margin * 2; // 186mm

  const darkNavy = [15, 23, 42];
  const lightBg = [248, 250, 252];
  const cardBg = [255, 255, 255];
  const borderCol = [226, 232, 240];
  const textDark = [15, 23, 42];
  const textMuted = [100, 116, 139];
  const roseOffer = [225, 29, 72];

  const modelImages = [
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=800&auto=format&fit=crop",
  ];

  const modelCache: { dataUrl: string | null; aspect: number }[] = [];
  for (const url of modelImages) {
    modelCache.push(await getBase64ImageFromUrl(url));
  }

  const brandGroups = new Map<string, GroupedShoeModel[]>();
  products.forEach((p) => {
    const bName = (p.brandName || "VEAZ ESTILEZA").trim().toUpperCase();
    if (!brandGroups.has(bName)) {
      brandGroups.set(bName, []);
    }
    brandGroups.get(bName)!.push(p);
  });

  const imageCache: Record<string, { dataUrl: string | null; aspect: number }> = {};
  await Promise.all(
    products.map(async (p) => {
      const url =
        p.imageUrl ||
        "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=600&auto=format&fit=crop";
      imageCache[p.key] = await getBase64ImageFromUrl(url);
    })
  );

  const coverImageUrl = products[0]?.imageUrl || "";
  const coverImgData = await getBase64ImageFromUrl(coverImageUrl);

  // ════════════════════════════════════════════════════════════════
  // 1. PORTADA EDITORIAL DE LUJO
  // ════════════════════════════════════════════════════════════════
  doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.8);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);
  doc.setLineWidth(0.3);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  doc.setFont("times", "bold");
  doc.setFontSize(32);
  doc.setTextColor(255, 255, 255);
  doc.text("VEAZ ESTILEZA", pageWidth / 2, 38, { align: "center" });

  doc.setFillColor(245, 158, 11);
  doc.rect(pageWidth / 2 - 25, 44, 50, 1, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(253, 230, 138);
  doc.text("LOOKBOOK INTERNACIONAL • STILETOS, TACOS & ALTA GALA", pageWidth / 2, 52, { align: "center" });

  // Imagen central de portada con proporción respetada
  if (coverImgData.dataUrl) {
    try {
      const boxW = 85;
      const boxH = 85;
      const boxX = (pageWidth - boxW) / 2;
      const boxY = 60;

      let drawW = boxW;
      let drawH = boxH;
      let drawX = boxX;
      let drawY = boxY;

      if (coverImgData.aspect > (boxW / boxH)) {
        drawH = boxW / coverImgData.aspect;
        drawY = boxY + (boxH - drawH) / 2;
      } else {
        drawW = boxH * coverImgData.aspect;
        drawX = boxX + (boxW - drawW) / 2;
      }

      doc.addImage(coverImgData.dataUrl, "JPEG", drawX, drawY, drawW, drawH);
      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.6);
      doc.rect(boxX, boxY, boxW, boxH);
    } catch { }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(245, 158, 11);
  doc.text("MARCAS OFICIALES EN PRODUCCIÓN:", pageWidth / 2, 153, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  const dynamicBrandsStr = Array.from(brandGroups.keys()).join("   •   ");
  doc.text(dynamicBrandsStr, pageWidth / 2, 160, { align: "center" });

  doc.setFillColor(30, 58, 138);
  doc.roundedRect(18, 172, pageWidth - 36, 75, 3, 3, "F");
  doc.setDrawColor(217, 119, 6);
  doc.roundedRect(18, 172, pageWidth - 36, 75, 3, 3, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(253, 230, 138);
  doc.text("ATENCIÓN COMERCIAL & VENTAS AL POR MAYOR", pageWidth / 2, 184, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("WhatsApp Pedidos: +51 929 962 458   •   beaz.estileza@gmail.com", pageWidth / 2, 193, { align: "center" });
  doc.text("Envíos seguros a nivel nacional con garantía de fábrica", pageWidth / 2, 201, { align: "center" });

  if (modelCache[0]?.dataUrl && modelCache[1]?.dataUrl) {
    try {
      doc.addImage(modelCache[0].dataUrl, "JPEG", 28, 210, 32, 30);
      doc.addImage(modelCache[1].dataUrl, "JPEG", pageWidth - 60, 210, 32, 30);
      doc.setDrawColor(253, 230, 138);
      doc.rect(28, 210, 32, 30);
      doc.rect(pageWidth - 60, 210, 32, 30);
    } catch { }
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(203, 213, 225);
  doc.text(`Edición Comercializada el ${new Date().toLocaleDateString("es-PE")} · Catálogo Oficial`, pageWidth / 2, 258, { align: "center" });


  // ════════════════════════════════════════════════════════════════
  // 2. SECCIONES DINÁMICAS POR MARCA
  // ════════════════════════════════════════════════════════════════
  const renderHeaderFooter = (brandName: string, primaryColor: number[]) => {
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.rect(0, 0, pageWidth, 20, "F");
    doc.setDrawColor(borderCol[0], borderCol[1], borderCol[2]);
    doc.line(0, 20, pageWidth, 20);

    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text("VEAZ ESTILEZA", margin, 10);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`LOOKBOOK OFICIAL • LÍNEA ${brandName.toUpperCase()}`, margin, 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text("WhatsApp: +51 929 962 458", pageWidth - margin, 12, { align: "right" });

    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.rect(0, pageHeight - 10, pageWidth, 10, "F");
    doc.setDrawColor(borderCol[0], borderCol[1], borderCol[2]);
    doc.line(0, pageHeight - 10, pageWidth, pageHeight - 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text("VEAZ ESTILEZA © Calzados originales con garantía y series completas de fábrica", margin, pageHeight - 4);
  };

  let brandCounter = 0;
  for (const [brandName, brandShoes] of brandGroups.entries()) {
    brandCounter++;
    const theme = getDynamicBrandTheme(brandName);
    const cardWidth = (contentWidth - 6) / 2; // ~90mm por tarjeta (Cuadrícula 2x2)
    const cardHeight = 112;
    const maxCardsPerPage = 4;

    let shoeIndex = 0;

    while (shoeIndex < brandShoes.length) {
      doc.addPage();
      renderHeaderFooter(brandName, theme.primary);

      let currentY = 23;

      if (shoeIndex === 0) {
        doc.setFillColor(theme.primary[0], theme.primary[1], theme.primary[2]);
        doc.roundedRect(margin, currentY, contentWidth, 24, 2, 2, "F");

        const bannerModel = modelCache[brandCounter % modelCache.length];
        if (bannerModel.dataUrl) {
          try {
            doc.addImage(bannerModel.dataUrl, "JPEG", margin + 3, currentY + 2, 20, 20);
            doc.setDrawColor(theme.accent[0], theme.accent[1], theme.accent[2]);
            doc.rect(margin + 3, currentY + 2, 20, 20);
          } catch { }
        }

        const textLeftMargin = bannerModel.dataUrl ? margin + 27 : margin + 6;

        doc.setFont("times", "bold");
        doc.setFontSize(13);
        doc.setTextColor(255, 255, 255);
        doc.text(brandName.toUpperCase(), textLeftMargin, currentY + 8);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(theme.accent[0], theme.accent[1], theme.accent[2]);
        doc.text("COLECCIÓN EXCLUSIVA & PASARELA 2026", textLeftMargin, currentY + 13.5);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(226, 232, 240);
        const dynamicQuoteText = getDynamicQuote(brandName, shoeIndex);
        doc.text(dynamicQuoteText, textLeftMargin, currentY + 19);

        currentY += 27;
      }

      const pageShoes = brandShoes.slice(shoeIndex, shoeIndex + maxCardsPerPage);

      for (let c = 0; c < pageShoes.length; c++) {
        const shoe = pageShoes[c];
        const col = c % 2;
        const row = Math.floor(c / 2);

        const cardX = margin + col * (cardWidth + 6);
        const cardY = currentY + row * (cardHeight + 4);

        doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
        doc.setDrawColor(borderCol[0], borderCol[1], borderCol[2]);
        doc.setLineWidth(0.4);
        doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 2.5, 2.5, "FD");

        // Contenedor de imagen de producto
        const imgBoxW = cardWidth - 6;
        const imgBoxH = 50;
        const imgBoxX = cardX + 3;
        const imgBoxY = cardY + 3;

        doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
        doc.roundedRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH, 2, 2, "F");

        const cachedImg = imageCache[shoe.key];
        if (cachedImg && cachedImg.dataUrl) {
          try {
            // CÁLCULO PROPORCIONAL ESTRICTO ANTI-APLANAMIENTO (Aspect Ratio Contain Fit)
            const innerW = imgBoxW - 2;
            const innerH = imgBoxH - 2;
            let pW = innerW;
            let pH = innerH;
            let pX = imgBoxX + 1;
            let pY = imgBoxY + 1;

            if (cachedImg.aspect > (innerW / innerH)) {
              pH = innerW / cachedImg.aspect;
              pY = imgBoxY + 1 + (innerH - pH) / 2;
            } else {
              pW = innerH * cachedImg.aspect;
              pX = imgBoxX + 1 + (innerW - pW) / 2;
            }

            doc.addImage(cachedImg.dataUrl, "JPEG", pX, pY, pW, pH);
          } catch {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
            doc.text("VEAZ ESTILEZA", imgBoxX + imgBoxW / 2, imgBoxY + 26, { align: "center" });
          }
        }

        let dY = imgBoxY + imgBoxH + 4;

        doc.setFillColor(theme.primary[0], theme.primary[1], theme.primary[2]);
        doc.roundedRect(cardX + 3, dY, 26, 4.5, 1, 1, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(255, 255, 255);
        doc.text(shoe.brandName.slice(0, 14).toUpperCase(), cardX + 5, dY + 3.2);

        if (shoe.heelHeight) {
          doc.setFillColor(241, 245, 249);
          doc.roundedRect(cardX + 31, dY, 26, 4.5, 1, 1, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(6);
          doc.setTextColor(textDark[0], textDark[1], textDark[2]);
          doc.text(`Taco: ${shoe.heelHeight.replace(/Taco/i, "").trim()}`, cardX + 33, dY + 3.2);
        }

        dY += 7;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
        const splitName = doc.splitTextToSize(shoe.name, cardWidth - 6);
        doc.text(splitName[0] || shoe.name, cardX + 3, dY);

        dY += 4.5;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        const colorText = shoe.color ? `Color: ${shoe.color}` : "Color exclusivo";
        const skuText = shoe.sku ? `SKU: ${shoe.sku}` : "";
        doc.text(`${colorText}${skuText ? `  •  ${skuText}` : ""}`, cardX + 3, dY);

        dY += 5;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
        doc.text("Tallas en serie:", cardX + 3, dY);

        dY += 3.5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        const seriesStr = shoe.variants.map((v) => `T${v.size}(${v.stock})`).join(" · ");
        const splitSeries = doc.splitTextToSize(seriesStr || "Disponibles en almacén", cardWidth - 6);
        doc.text(splitSeries[0] || seriesStr, cardX + 3, dY);

        dY += 4;
        doc.setFontSize(6);
        doc.setTextColor(10, 150, 90);
        doc.text(`✓ ${shoe.totalStock} pares listos para despacho`, cardX + 3, dY);

        const priceBoxY = cardY + cardHeight - 15;
        const priceBoxW = cardWidth - 6;

        doc.setFillColor(theme.badgeBg[0], theme.badgeBg[1], theme.badgeBg[2]);
        doc.setDrawColor(borderCol[0], borderCol[1], borderCol[2]);
        doc.roundedRect(cardX + 3, priceBoxY, priceBoxW, 11, 1.5, 1.5, "FD");

        if (shoe.hasOffer && shoe.adjustedPrice && shoe.adjustedPrice > 0) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(roseOffer[0], roseOffer[1], roseOffer[2]);
          doc.text(`S/ ${shoe.adjustedPrice.toFixed(2)}`, cardX + 6, priceBoxY + 5);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(6);
          doc.setTextColor(148, 163, 184);
          doc.text(`Antes: S/ ${shoe.minPrice.toFixed(2)}`, cardX + 6, priceBoxY + 9);

          doc.setFillColor(roseOffer[0], roseOffer[1], roseOffer[2]);
          doc.roundedRect(cardX + priceBoxW - 18, priceBoxY + 2.5, 16, 5.5, 1, 1, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(5.5);
          doc.setTextColor(255, 255, 255);
          doc.text("¡OFERTA!", cardX + priceBoxW - 10, priceBoxY + 6.2, { align: "center" });
        } else {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(theme.primary[0], theme.primary[1], theme.primary[2]);
          doc.text(`S/ ${shoe.minPrice.toFixed(2)}`, cardX + 6, priceBoxY + 7);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(6);
          doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
          doc.text("Garantía de Fábrica", cardX + priceBoxW - 4, priceBoxY + 7, { align: "right" });
        }
      }

      shoeIndex += maxCardsPerPage;
    }
  }

  // ════════════════════════════════════════════════════════════════
  // 3. CONTRAPORTADA DE CIERRE
  // ════════════════════════════════════════════════════════════════
  doc.addPage();
  doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.8);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);
  doc.setLineWidth(0.3);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  doc.setFont("times", "bold");
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.text("VEAZ ESTILEZA", pageWidth / 2, 45, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(253, 230, 138);
  doc.text("DONDE LA ELEGANCIA SE CORONA", pageWidth / 2, 54, { align: "center" });

  doc.setFillColor(30, 58, 138);
  doc.roundedRect(18, 66, pageWidth - 36, 120, 3, 3, "F");
  doc.setDrawColor(217, 119, 6);
  doc.roundedRect(18, 66, pageWidth - 36, 120, 3, 3, "S");

  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.setTextColor(253, 230, 138);
  doc.text("ELEGANCIA Y DISTINCIÓN EN CADA MODELO", pageWidth / 2, 82, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(241, 245, 249);
  doc.text("Nuestros calzados combinan diseño europeo, horma ergonómica", pageWidth / 2, 94, { align: "center" });
  doc.text("y materiales seleccionados para garantizar confort y durabilidad.", pageWidth / 2, 101, { align: "center" });
  doc.text("Abastecemos boutiques y mayoristas con series completas originales.", pageWidth / 2, 110, { align: "center" });

  if (modelCache[0]?.dataUrl && modelCache[2]?.dataUrl) {
    try {
      doc.addImage(modelCache[0].dataUrl, "JPEG", 30, 118, 48, 45);
      doc.addImage(modelCache[2].dataUrl, "JPEG", pageWidth - 78, 118, 48, 45);
      doc.setDrawColor(245, 158, 11);
      doc.rect(30, 118, 48, 45);
      doc.rect(pageWidth - 78, 118, 48, 45);
    } catch { }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(245, 158, 11);
  doc.text("CANALES OFICIALES DE PEDIDOS", pageWidth / 2, 202, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("WhatsApp Ventas: +51 929 962 458", pageWidth / 2, 213, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text("Correo: beaz.estileza@gmail.com", pageWidth / 2, 221, { align: "center" });
  doc.text("Atención: Lunes a Domingo de 8:00 am a 8:30 pm", pageWidth / 2, 229, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text("VEAZ ESTILEZA • Catálogo comercial sincronizado con base de datos en tiempo real.", pageWidth / 2, 262, { align: "center" });

  const totalPages = doc.getNumberOfPages();
  for (let p = 2; p < totalPages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(`Página ${p} de ${totalPages}`, pageWidth - margin, pageHeight - 4, { align: "right" });
  }

  const filename = `Catalogo-VEAZ-ESTILEZA-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateLeadDto {
  name: string;
  phone: string;
  email?: string;
  businessName?: string;
  businessType?: string;
  interestType?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  notes?: string;
  monthlySalesVolume?: string;
  utmSource?: string;
  utmCampaign?: string;
}

export interface ChatMessageDto {
  message: string;
  phone?: string;
  name?: string;
  businessType?: string;
  leadId?: string;
}

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateLeadDto) {
    return this.prisma.lead.create({
      data: {
        name: data.name || 'Prospecto Web',
        phone: data.phone,
        email: data.email || null,
        businessName: data.businessName || null,
        businessType: data.businessType || null,
        interestType: data.interestType || 'DEMO',
        appointmentDate: data.appointmentDate || null,
        appointmentTime: data.appointmentTime || null,
        notes: data.notes || null,
        monthlySalesVolume: data.monthlySalesVolume || null,
        utmSource: data.utmSource || 'LandingPage',
        utmCampaign: data.utmCampaign || null,
      },
    });
  }

  async handleChatMessage(dto: ChatMessageDto) {
    const text = (dto.message || '').trim().toLowerCase();
    let reply = '';
    let quickActions: string[] = [];
    let suggestedAction: 'ASK_PHONE' | 'SCHEDULE_DEMO' | 'SHOW_PRICING' | 'GENERAL' = 'GENERAL';

    // Extracción heurística de número si viene en el mensaje
    const phoneMatch = dto.message.match(/(\+?51)?\s?9\d{8}|\b\d{9}\b/);
    const detectedPhone = phoneMatch ? phoneMatch[0].replace(/\s+/g, '') : dto.phone;

    let leadRecord: any = null;
    if (detectedPhone || dto.name) {
      // Registrar o actualizar lead
      leadRecord = await this.prisma.lead.create({
        data: {
          name: dto.name || 'Prospecto Chat THINK',
          phone: detectedPhone || 'Por confirmar',
          businessType: dto.businessType || 'General',
          interestType: 'CHAT',
          notes: `Pregunta en Chat: "${dto.message}"`,
          utmSource: 'ChatWidget',
        },
      });
    }

    if (text.includes('precio') || text.includes('costo') || text.includes('plan') || text.includes('cuanto')) {
      reply = '¡Excelente pregunta! 🚀 THINK ofrece planes diseñados para emprendedores y empresas en crecimiento, con acceso a POS ultrarrápido, inventario con tallas/series, kardex, reportes y boletas/facturas electrónicas ilimitadas. ¿Te gustaría agendar una demo en vivo de 15 minutos o recibir un descuento especial por WhatsApp?';
      quickActions = ['Separar Demostración Gratuita', 'Ver Planes y Descuentos', 'Hablar con un Asesor Humano'];
      suggestedAction = 'SCHEDULE_DEMO';
    } else if (text.includes('calzado') || text.includes('serie') || text.includes('talla') || text.includes('zapato')) {
      reply = '👟 ¡Somos especialistas en calzado y moda! THINK cuenta con el motor de Series más avanzado del mercado: gestiona curvas de tallas (34 al 39, repeticiones), control de tacos, códigos de barra por par o por serie, y etiquetas listas para vitrina o caja. ¿Deseas ver cómo funciona en tu tienda?';
      quickActions = ['Agendar Demo de Calzado', '¿Cómo imprime etiquetas?', 'Consultar Precios'];
      suggestedAction = 'SCHEDULE_DEMO';
    } else if (text.includes('demo') || text.includes('cita') || text.includes('probar') || text.includes('reunion')) {
      reply = '🎯 ¡Perfecto! Podemos coordinar una videollamada personalizada o una demostración guiada donde te enseñaremos a configurar tu inventario, ventas y caja en minutos. Déjanos tu número de WhatsApp y la hora en que te convenga.';
      quickActions = ['Agendar Cita Ahora', 'Enviar WhatsApp Express', '¿Qué requisitos necesito?'];
      suggestedAction = 'SCHEDULE_DEMO';
    } else if (text.includes('boleta') || text.includes('factura') || text.includes('sunat')) {
      reply = '📄 Sí, THINK se integra con facturación electrónica SUNAT para emitir boletas, facturas y notas de crédito en segundos directamente desde tu punto de venta en PC, tablet o celular.';
      quickActions = ['¿Cómo se activa SUNAT?', 'Agendar Demostración', 'Hablar con Ventas'];
      suggestedAction = 'GENERAL';
    } else {
      reply = '¡Hola! 👋 Soy tu Asesor Virtual THINK. Puedo mostrarte cómo controlar tu stock en tiempo real, evitar robos y fugas de dinero, vender a la velocidad de la luz y emitir comprobantes. ¿De qué rubro es tu negocio (calzados, ropa, minimarket, distribuidora u otro)?';
      quickActions = ['Tienda de Calzados / Moda', 'Minimarket / Abarrotes', 'Ferretería / Distribuidora', 'Agendar Demo'];
      suggestedAction = 'ASK_PHONE';
    }

    return {
      reply,
      quickActions,
      suggestedAction,
      leadId: leadRecord ? leadRecord.id : null,
      saved: !!leadRecord,
    };
  }

  async findAll(status?: string) {
    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    return this.prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead no encontrado');
    return lead;
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.lead.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.lead.delete({ where: { id } });
  }

  async getStats() {
    const [total, newCount, scheduled, won] = await Promise.all([
      this.prisma.lead.count(),
      this.prisma.lead.count({ where: { status: 'NEW' } }),
      this.prisma.lead.count({ where: { status: 'SCHEDULED' } }),
      this.prisma.lead.count({ where: { status: 'WON' } }),
    ]);

    return {
      total,
      newCount,
      scheduled,
      won,
    };
  }
}
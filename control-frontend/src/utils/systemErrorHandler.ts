export interface SystemErrorInfo {
  code: string;
  category: 'SUNAT' | 'VALIDATION' | 'BILLING' | 'NETWORK' | 'AUTH' | 'BUSINESS' | 'GENERAL';
  title: string;
  message: string;
  cause?: string;
  actionPlan: string[];
  technicalDetails?: string;
  actionUrl?: string;
  actionText?: string;
}

/**
 * Traduce e interpreta cualquier error del sistema o de SUNAT/CCOFACT
 * convirtiendo códigos crudos o excepciones técnicas en explicaciones comprensibles y accionables.
 */
export function parseSystemError(err: any, fallbackTitle: string = 'Atención del Sistema'): SystemErrorInfo {
  let rawMessage = '';
  let rawCode = '';
  let technical = '';

  if (typeof err === 'string') {
    rawMessage = err;
  } else if (err) {
    rawMessage =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.response?.data?.detail ||
      err.data?.message ||
      err.data?.error ||
      err.message ||
      err.error ||
      JSON.stringify(err);

    rawCode =
      err.response?.data?.code ||
      err.response?.data?.sunatCode ||
      err.code ||
      err.sunatResponseCode ||
      '';

    technical = err.stack || (err.response ? JSON.stringify(err.response.data, null, 2) : '');
  }

  const normalized = (rawMessage + ' ' + rawCode).toLowerCase();

  // 1. Error de credenciales SOL (1033 / Client.1033)
  if (
    normalized.includes('1033') ||
    normalized.includes('usuario secundario sol') ||
    normalized.includes('clave sol') ||
    normalized.includes('client.1033')
  ) {
    return {
      code: 'SUNAT-1033',
      category: 'SUNAT',
      title: 'Credenciales SOL Incorrectas o Sin Autorización',
      message:
        'SUNAT rechazó la autenticación porque el Usuario Secundario SOL o la Clave SOL configurados en tu empresa no coinciden con los registrados en el portal oficial de SUNAT.',
      cause:
        'Ocurre cuando la clave SOL secundaria fue cambiada recientemente, el usuario tiene espacios accidentales o carece de permisos de Facturación Electrónica en SOL.',
      actionPlan: [
        'Ve a "Facturación" > "Configuración de Empresa" en el menú principal.',
        'Verifica que el Usuario SOL secundario esté escrito en mayúsculas y sin espacios.',
        'Reingresa la Clave SOL secundaria asignada en SUNAT Operaciones en Línea.',
        'Asegúrate de que en el portal de SUNAT dicho usuario secundario tenga asignado el rol de "Comprobantes de Pago Electrónicos".',
        'Guarda los cambios y vuelve a intentar la operación.',
      ],
      technicalDetails: technical || rawMessage,
      actionUrl: '/business/billing?tab=config',
      actionText: 'Ir a Configuración de Facturación',
    };
  }

  // 2. Error de permisos de usuario secundario (1034)
  if (normalized.includes('1034') || normalized.includes('no tiene permisos')) {
    return {
      code: 'SUNAT-1034',
      category: 'SUNAT',
      title: 'Usuario SOL sin Permisos de Emisión',
      message:
        'El Usuario Secundario SOL no tiene asignados los perfiles necesarios para emitir comprobantes o notas de crédito electrónicas.',
      cause: 'El usuario secundario fue creado en SUNAT pero no se le marcaron los permisos para facturación.',
      actionPlan: [
        'Ingresa con tu RUC y Clave SOL principal a sunat.gob.pe.',
        'Dirígete a "Administración de Usuarios Secundarios".',
        'Selecciona el usuario y habilita los accesos a "Emisión Electrónica SEE-SOL".',
      ],
      technicalDetails: technical || rawMessage,
      actionUrl: '/business/billing?tab=config',
      actionText: 'Revisar Configuración',
    };
  }

  // 3. Duplicidad de comprobante / conflicto de correlativo (2335)
  if (
    normalized.includes('2335') ||
    normalized.includes('ya fue emitido') ||
    normalized.includes('comprobante duplicado') ||
    normalized.includes('ya existe')
  ) {
    return {
      code: 'SUNAT-2335',
      category: 'SUNAT',
      title: 'Número de Comprobante ya Registrado en SUNAT',
      message:
        'El número correlativo que se intentó enviar ya fue emitido y aceptado previamente en los servidores de SUNAT.',
      cause:
        'Este desfase ocurre si se emitieron comprobantes desde otro sistema, desde el portal SUNAT o si se restableció la base de datos sin actualizar el último correlativo.',
      actionPlan: [
        'Ingresa al módulo "Facturación" en el sistema.',
        'Revisa los "Inicializadores de Series y Correlativos".',
        'Incrementa el correlativo al número posterior al último registrado en SUNAT.',
        'Haz clic en "Inicializar y Guardar" para sincronizar la numeración oficial.',
      ],
      technicalDetails: technical || rawMessage,
      actionUrl: '/business/billing',
      actionText: 'Ajustar Correlativos',
    };
  }

  // 4. Rango de fecha no permitido (2108 / 2109)
  if (
    normalized.includes('2108') ||
    normalized.includes('2109') ||
    normalized.includes('fecha de emision') ||
    normalized.includes('fecha invalida')
  ) {
    return {
      code: 'SUNAT-2108',
      category: 'SUNAT',
      title: 'Fecha de Emisión Fuera del Plazo Permitido',
      message:
        'SUNAT solo admite comprobantes con fecha de emisión de hasta 3 días calendario anteriores a la fecha actual (o hasta 2 días futuros).',
      cause: 'La fecha configurada en la venta excede el límite tributario fijado por SUNAT.',
      actionPlan: [
        'Verifica que la fecha seleccionada no sea más antigua de 3 días atrás.',
        'Asegúrate de que la fecha y hora de tu dispositivo o servidor estén sincronizadas con la hora oficial de Perú.',
      ],
      technicalDetails: technical || rawMessage,
    };
  }

  // 5. Comprobante de referencia para Nota de Crédito no existe o ya anulado (2800 / 2801)
  if (
    normalized.includes('2800') ||
    normalized.includes('2801') ||
    normalized.includes('comprobante modificado no existe') ||
    normalized.includes('ya fue anulado')
  ) {
    return {
      code: 'SUNAT-2800',
      category: 'SUNAT',
      title: 'Comprobante de Referencia No Válido para Nota de Crédito',
      message:
        'La Factura o Boleta que se intenta anular o rectificar no se encuentra registrada en los servidores de SUNAT o ya fue previamente anulada.',
      cause:
        'El comprobante original no fue aceptado en SUNAT en su momento, o ya cuenta con una Nota de Crédito previa que lo dio de baja.',
      actionPlan: [
        'Consulta el estado del comprobante original en el portal de SUNAT o en tu historial de comprobantes.',
        'Si el comprobante nunca llegó a SUNAT (quedó observado o en borrador), no requiere Nota de Crédito.',
        'Si ya fue anulado con anterioridad, la operación comercial ya está regularizada.',
      ],
      technicalDetails: technical || rawMessage,
    };
  }

  // 5b. Error 3051: Nombre de tributo no corresponde al código de tributo de la línea (Catálogo 05)
  if (
    normalized.includes('3051') ||
    normalized.includes('nombre de tributo no corresponde') ||
    (normalized.includes('cat_05') && normalized.includes('9997')) ||
    (normalized.includes('cat_05') && normalized.includes('9998'))
  ) {
    return {
      code: 'SUNAT-3051',
      category: 'SUNAT',
      title: 'Discrepancia en Catálogo 05 UBL (Exonerado / Inafecto)',
      message:
        'SUNAT rechazó el comprobante porque la descripción del esquema tributario no coincide estrictamente con la convención UBL 2.1 del Catálogo 05.',
      cause:
        'SUNAT exige estrictamente los nombres abreviados oficiales "EXO" para el código 9997 (Exonerado) e "INA" para el código 9998 (Inafecto).',
      actionPlan: [
        'El motor UBL de CCOFACT ya cuenta con la corrección oficial a "EXO" / "INA".',
        'Presiona el botón "Reintentar Envío" o "Regenerar XML" en el comprobante rechazado para enviarlo con la nomenclatura corregida.',
        'SUNAT aceptará el comprobante de inmediato emitiendo el CDR de conformidad.',
      ],
      technicalDetails: technical || rawMessage,
      actionUrl: '/business/billing',
      actionText: 'Ir a Facturación',
    };
  }

  // 6. Certificado digital vencido o no válido (0100..0199)
  if (
    normalized.includes('certificado') ||
    normalized.includes('pfx') ||
    normalized.includes('0100') ||
    normalized.includes('caducado') ||
    normalized.includes('clave privada')
  ) {
    return {
      code: 'CERT-0100',
      category: 'SUNAT',
      title: 'Certificado Digital Tributario Inválido o Expirado',
      message:
        'El certificado digital tributario (.PFX / .P12) no es válido, ha caducado o la contraseña ingresada es incorrecta.',
      cause: 'La firma digital electrónica es rechazada por SUNAT al validar la huella del certificado.',
      actionPlan: [
        'Revisa la vigencia de tu Certificado Digital Tributario.',
        'Si renovaste certificado, súbelo nuevamente en la Configuración de Empresa.',
        'Verifica que la contraseña del certificado no contenga errores.',
      ],
      technicalDetails: technical || rawMessage,
      actionUrl: '/business/billing?tab=config',
      actionText: 'Actualizar Certificado',
    };
  }

  // 7. Boleta mayor a S/ 700 sin DNI
  if (
    normalized.includes('700') ||
    (normalized.includes('boleta') && (normalized.includes('dni') || normalized.includes('identificacion')))
  ) {
    return {
      code: 'VAL-BOLETA-700',
      category: 'VALIDATION',
      title: 'Identificación Obligatoria para Boletas ≥ S/ 700.00',
      message:
        'Conforme a la normativa oficial de SUNAT (Res. 007-99/SUNAT), las boletas por montos de S/ 700.00 a más requieren la identificación obligatoria del comprador.',
      cause: 'Se intentó emitir una boleta por S/ 700 o superior asignándola a "CLIENTES VARIOS" o sin un DNI de 8 dígitos.',
      actionPlan: [
        'Solicita al cliente su DNI (8 dígitos) o RUC (11 dígitos).',
        'Ingresa el número y presiona la lupa de búsqueda para obtener sus datos oficiales.',
        'Asegúrate de que los nombres y apellidos estén completos antes de confirmar la venta.',
      ],
      technicalDetails: technical || rawMessage,
    };
  }

  // 8. Requerimiento de Bancarización (≥ S/ 2,000)
  if (normalized.includes('bancariz') || normalized.includes('2000')) {
    return {
      code: 'VAL-BANCARIZACION-2000',
      category: 'VALIDATION',
      title: 'Sugerencia Tributaria: Ley de Bancarización',
      message:
        'La operación supera los S/ 2,000.00 (o US$ 500.00), monto sujeto a la Ley de Bancarización (Ley N° 28194 de SUNAT).',
      cause: 'SUNAT exige que las transacciones iguales o mayores a S/ 2,000 utilicen medios de pago bancarios.',
      actionPlan: [
        'Se recomienda seleccionar como medio de pago: Transferencia Bancaria, Tarjeta de Crédito/Débito o Depósito.',
        'Evita registrar pagos de esta magnitud en efectivo para respaldar el costo o gasto fiscal.',
      ],
      technicalDetails: technical || rawMessage,
    };
  }

  // 9. Factura sin RUC o con DNI
  if (
    normalized.includes('factura') &&
    (normalized.includes('ruc') || normalized.includes('modulo 11') || normalized.includes('clientes varios'))
  ) {
    return {
      code: 'VAL-FACTURA-RUC',
      category: 'VALIDATION',
      title: 'RUC Requerido para Facturas Electrónicas',
      message:
        'Las Facturas Electrónicas únicamente pueden emitirse a empresas o personas jurídicas/naturales con RUC válido de 11 dígitos.',
      cause: 'No se puede emitir una factura electrónica con DNI, carné ni a nombre de "CLIENTES VARIOS".',
      actionPlan: [
        'Ingresa un número de RUC de 11 dígitos (comienza con 10, 20, 15, 17, etc.).',
        'Presiona el botón de consulta SUNAT para autocompletar la Razón Social y Domicilio Fiscal.',
        'Si el cliente no tiene RUC, debes emitirle una Boleta de Venta o una Nota de Venta interna.',
      ],
      technicalDetails: technical || rawMessage,
    };
  }

  // 10. Conexión no disponible con CCOFACT o Backend
  if (
    normalized.includes('network error') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('econnrefused') ||
    normalized.includes('timeout') ||
    normalized.includes('504') ||
    normalized.includes('502') ||
    normalized.includes('no se pudo conectar')
  ) {
    return {
      code: 'NET-OFFLINE',
      category: 'NETWORK',
      title: 'Servicio de Facturación no Disponible',
      message:
        'El sistema no pudo comunicarse con el motor de facturación electrónica CCOFACT o los servidores tributarios.',
      cause:
        'El servicio del facturador puede estar en mantenimiento, iniciando o no se tiene conexión a internet.',
      actionPlan: [
        'Verifica que tu conexión a internet sea estable.',
        'En tu servidor VPS, comprueba que los procesos de backend y CCOFACT se encuentren en estado ONLINE (pm2 status).',
        'Si el facturador está temporalmente fuera de línea, puedes emitir una Nota de Venta comercial mientras se restablece el servicio.',
      ],
      technicalDetails: technical || rawMessage,
      actionUrl: '/business/billing',
      actionText: 'Comprobar Estado de Facturación',
    };
  }

  // 11. Caja cerrada
  if (normalized.includes('cierre de caja') || normalized.includes('caja cerrada') || normalized.includes('cashshift')) {
    return {
      code: 'BUS-CASH-SHIFT-CLOSED',
      category: 'BUSINESS',
      title: 'Turno de Caja Cerrado',
      message:
        'No es posible modificar ni eliminar una venta que pertenece a un turno de caja que ya fue cerrado y auditado.',
      cause: 'Por seguridad contable, los movimientos de turnos liquidados no pueden ser alterados.',
      actionPlan: [
        'Si necesitas regularizar la operación, realiza un ajuste en el turno de caja abierto actual.',
        'Consulta con el administrador de la empresa si es estrictamente necesario auditar el turno cerrado.',
      ],
      technicalDetails: technical || rawMessage,
    };
  }

  // Fallback genérico profesional y bien explicado
  return {
    code: rawCode ? `SYS-${rawCode}` : 'SYS-ERROR',
    category: 'GENERAL',
    title: fallbackTitle,
    message: rawMessage || 'Ocurrió una situación inesperada al procesar la operación.',
    cause: 'El servidor o el motor de procesamiento no completó la acción solicitada.',
    actionPlan: [
      'Revisa los datos ingresados en el formulario.',
      'Si el incidente persiste, actualiza la página y vuelve a intentar la operación.',
      'Puedes consultar la bitácora o contactar con el soporte del sistema.',
    ],
    technicalDetails: technical || rawMessage,
  };
}

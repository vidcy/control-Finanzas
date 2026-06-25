export const defaultCategories = {
  /* =====================================================
       💰 INGRESOS (COLORES VERDES)
    ===================================================== */
  INCOME: [
    // Sueldo principal (azul fuerte - estabilidad)
    { name: 'Sueldo', color: 'bg-blue-600', subcategories: [] },

    // Capacitaciones (morado - conocimiento)
    {
      name: 'Capacitaciones Terceros',
      color: 'bg-purple-500',
      subcategories: [],
    },

    // Inversiones (amarillo dorado - dinero/ganancia)
    {
      name: 'Rendimientos Inversiones',
      color: 'bg-yellow-500',
      subcategories: [],
    },

    // Asesorías (indigo - profesional)
    { name: 'Asesorías', color: 'bg-indigo-500', subcategories: [] },

    // Beneficios tarjeta (rosa - cashback / rewards)
    {
      name: 'Beneficios Tarjeta de Crédito',
      color: 'bg-pink-500',
      subcategories: [],
    },

    // Comisiones (naranja - ventas / energía)
    { name: 'Comisiones', color: 'bg-orange-500', subcategories: [] },

    // Ingresos adicionales (rojo - extra / irregular)
    { name: 'Ingreso Adicional 1', color: 'bg-red-500', subcategories: [] },

    // Segundo ingreso adicional (cyan - diferenciación)
    { name: 'Ingreso Adicional 2', color: 'bg-cyan-500', subcategories: [] },

    // Negocio (verde - negocio)
    { name: 'Negocio-Ingreso', color: 'bg-green-500', subcategories: [] },
  ],

  /* =====================================================
       💸 GASTOS (COLORES CÁLIDOS Y VARIADOS)
    ===================================================== */
  EXPENSE: [
    /* ---------------- IMPUESTOS ---------------- */
    {
      name: 'Impuestos',
      color: 'bg-red-500',
      subcategories: [
        { name: 'Pensiones obligatorias' },
        { name: 'Renta de 5ta' },
        { name: 'Provisión de impuesto de renta' },
        { name: 'Provisión de impuesto predial' },
        { name: 'Otros impuestos' },
      ],
    },

    /* ---------------- VIVIENDA ---------------- */
    {
      name: 'Vivienda',
      color: 'bg-orange-500',
      subcategories: [
        { name: 'Pago de alquiler/hipoteca' },
        { name: 'Mantenimiento' },
        { name: 'Servicio doméstico' },
        { name: 'Artículos de Aseo' },
        { name: 'Electrodomésticos' },
        { name: 'Decoración' },
      ],
    },

    /* ---------------- SERVICIOS ---------------- */
    {
      name: 'Servicios',
      color: 'bg-amber-500',
      subcategories: [
        { name: 'Agua' },
        { name: 'Gas' },
        { name: 'Electricidad' },
        { name: 'Internet' },
        { name: 'Celular 01' },
        { name: 'Celular 02' },
        { name: 'Celular Familia' },
        { name: 'Luz Casa Moche' },
        { name: 'Internet Casa Moche' },
      ],
    },

    /* ---------------- ALIMENTACIÓN ---------------- */
    {
      name: 'Alimentación',
      color: 'bg-lime-500',
      subcategories: [
        { name: 'Carne' },
        { name: 'Verduras' },
        { name: 'Mercado General' },
        { name: 'Salidas sociales' },
        { name: 'Salidas familiares' },
        { name: 'Delivery' },
        { name: 'Snacks y cafés' },
        { name: 'Bebidas no alcohólicas' },
        { name: 'Gaseosas' },
        { name: 'Licor' },
        { name: 'Menú' },
        { name: 'Desayuno' },
      ],
    },

    /* ---------------- TRANSPORTE ---------------- */
    {
      name: 'Transporte',
      color: 'bg-emerald-500',
      subcategories: [
        { name: 'Cuota crédito vehículo' },
        { name: 'Mantenimiento' },
        { name: 'Combustible' },
        { name: 'Parqueadero' },
        { name: 'Lavado' },
        { name: 'Aceite' },
        { name: 'Transporte público' },
        { name: 'Taxis' },
        { name: 'Pasajes familia' },
        { name: 'Avión' },
        { name: 'Buses interprovinciales' },
      ],
    },

    /* ---------------- GASTOS PERSONALES ---------------- */
    {
      name: 'Gastos Personales',
      color: 'bg-cyan-500',
      subcategories: [
        { name: 'Ropa' },
        { name: 'Zapatillas' },
        { name: 'Accesorios' },
        { name: 'Peluquería' },
        { name: 'Gimnasio' },
        { name: 'Masajista' },
        { name: 'Medicina' },
        { name: 'Productos de belleza' },
        { name: 'Personal Trainer' },
        { name: 'Dentista' },
      ],
    },

    /* ---------------- ENTRETENIMIENTO ---------------- */
    {
      name: 'Entretenimiento',
      color: 'bg-violet-500',
      subcategories: [
        { name: 'Cine' },
        { name: 'Teatro' },
        { name: 'Discoteca / Bar' },
        { name: 'Fútbol / Deportes' },
        { name: 'Tickets avión' },
        { name: 'Tickets bus' },
        { name: 'Viajes familia' },
        { name: 'Salidas familiares' },
        { name: 'Conciertos' },
        { name: 'Salidas amigos' },
      ],
    },

    /* ---------------- MASCOTAS ---------------- */
    {
      name: 'Mascotas',
      color: 'bg-pink-500',
      subcategories: [
        { name: 'Alimento' },
        { name: 'Veterinario' },
        { name: 'Medicamentos' },
        { name: 'Guarderías' },
        { name: 'Paseos' },
        { name: 'Antipulgas' },
        { name: 'Juguetes' },
        { name: 'Otros' },
      ],
    },

    /* ---------------- SEGUROS ---------------- */
    {
      name: 'Seguros',
      color: 'bg-teal-500',
      subcategories: [
        { name: 'Vida' },
        { name: 'Hogar' },
        { name: 'Salud' },
        { name: 'Seguro viajes' },
      ],
    },

    /* ---------------- EDUCACIÓN ---------------- */
    {
      name: 'Educación',
      color: 'bg-indigo-500',
      subcategories: [
        { name: 'Crédito educativo' },
        { name: 'Seminarios' },
        { name: 'Libros' },
        { name: 'Ebooks' },
        { name: 'Audios' },
        { name: 'Software' },
        { name: 'Revistas' },
        { name: 'Clubes académicos' },
        { name: 'Cursos idiomas' },
        { name: 'Pensión universidad' },
      ],
    },

    /* ---------------- AHORRO ---------------- */
    {
      name: 'Ahorro Mensual',
      color: 'bg-green-500',
      subcategories: [
        { name: 'Aporte alto rendimiento' },
        { name: 'Meta ahorro 10%' },
        { name: 'Ahorro AFP' },
        { name: 'Compra gusto personal' },
      ],
    },

    /* ---------------- INVERSIONES ---------------- */
    {
      name: 'Inversiones',
      color: 'bg-sky-500',
      subcategories: [
        { name: 'Cuotas créditos productivos' },
        { name: 'Mensualidades' },
        { name: 'Abonos' },
        { name: 'Inversiones personales' },
        { name: 'Inversiones terceros' },
        { name: 'Otros' },
      ],
    },

    /* ---------------- SERVICIOS PROFESIONALES ---------------- */
    {
      name: 'Servicios Profesionales',
      color: 'bg-purple-500',
      subcategories: [
        { name: 'Contador' },
        { name: 'Abogado' },
        { name: 'Mensajero' },
        { name: 'Asistente personal' },
        { name: 'Agente viajes' },
        { name: 'Conserje / Conductor' },
        { name: 'Terapeuta de voz' },
      ],
    },

    /* ---------------- CRÉDITOS ---------------- */
    {
      name: 'Pago de Créditos',
      color: 'bg-red-600',
      subcategories: [
        { name: 'Crédito personal' },
        { name: 'Seguro tarjetas' },
        { name: 'Abonos tarjetas' },
        { name: 'Penalidades' },
        { name: 'Otros' },
      ],
    },

    /* ---------------- CONTRIBUCIONES ---------------- */
    {
      name: 'Contribución',
      color: 'bg-yellow-500',
      subcategories: [
        { name: 'Diezmos / ofrendas' },
        { name: 'Fundaciones' },
        { name: 'Donaciones' },
        { name: 'Dádivas' },
        { name: 'Apoyo causas' },
        { name: 'Otros' },
      ],
    },

    /* ---------------- CONTINGENCIAS ---------------- */
    {
      name: 'Contingencias',
      color: 'bg-rose-600',
      subcategories: [
        { name: 'Urgencias médicas' },
        { name: 'Emergencias familiares' },
        { name: 'Gastos imprevistos' },
      ],
    },

    /* ---------------- SUSCRIPCIONES ---------------- */
    {
      name: 'Suscripciones',
      color: 'bg-indigo-500',
      subcategories: [
        { name: 'Apple' },
        { name: 'Netflix' },
        { name: 'Roam Research' },
        { name: 'Suscripción 1' },
        { name: 'Suscripción 2' },
      ],
    },

    /* ---------------- OCASIONES ESPECIALES ---------------- */
    {
      name: 'Ocasiones Especiales',
      color: 'bg-pink-600',
      subcategories: [
        { name: 'Regalos amigos' },
        { name: 'Regalos familia' },
        { name: 'Aniversarios' },
      ],
    },

    /* ---------------- PERSONAS A CARGO ---------------- */
    {
      name: 'Gastos Personas a Cargo',
      color: 'bg-rose-500',
      subcategories: [
        { name: 'Mesadas' },
        { name: 'Adobe' },
        { name: 'Universidad' },
        { name: 'Transporte escolar' },
        { name: 'Pediatra / Médico' },
        { name: 'Pañales' },
        { name: 'Niñera / enfermera' },
        { name: 'Cursos vacaciones' },
        { name: 'Alimentos especiales' },
        { name: 'Vacunas / medicamentos' },
        { name: 'Peluquería cuidados' },
        { name: 'Juguetes' },
        { name: 'Otros' },
      ],
    },
    /* ---------------- PERSONAS A CARGO ---------------- */
    {
      name: 'Negocio-Egreso',
      color: 'bg-rose-500',
      subcategories: [],
    },
  ],
};

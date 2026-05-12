import React, { useState } from "react";
import Appshell from "../components/layout/Appshell";
import { LayoutDashboard, Wallet, TrendingUp, TrendingDown, ChevronDown, ChevronRight, Calendar, BarChart3, Activity } from "lucide-react";

const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"];

// --- ESTRUCTURA DE DATOS EXTRAÍDA DEL EXCEL (INALTERADA) ---
const INCOMES = [
    { name: "Sueldo", values: [2500, 2500, 2500, 2500, 2500, 2500, 3000, 2500, 2500, 2500, 2500, 5000] },
    { name: "Capacitaciones Terceros", values: [0, 500, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { name: "Rendimientos Inversiones", values: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100] },
    { name: "Asesorías", values: [0, 0, 800, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { name: "Beneficios de Tarjeta de Crédito", values: [0, 0, 0, 0, 50, 0, 0, 0, 0, 0, 0, 0] },
    { name: "Comisiones", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { name: "Ingreso Adicional 1", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { name: "Ingreso Adicional 2", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
];

const EXPENSES = [
    {
        category: "Impuestos",
        subcategories: [
            { name: "Pago de impuestos", values: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50] },
            { name: "Renta de 4ta", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Provisión de impuesto de renta", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Provisión de impuesto predial", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Otros impuestos", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        ]
    },
    {
        category: "Vivienda",
        subcategories: [
            { name: "Pago de alquiler/hipoteca", values: [800, 800, 800, 800, 800, 800, 800, 800, 800, 800, 800, 800] },
            { name: "Mantenimiento", values: [100, 0, 100, 0, 100, 0, 100, 0, 100, 0, 100, 0] },
            { name: "Servicio doméstico", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Artículos de Aseo", values: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50] },
            { name: "Electrodomésticos", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Reparación", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        ]
    },
    {
        category: "Servicios",
        subcategories: [
            { name: "Agua", values: [40, 40, 45, 40, 40, 45, 40, 40, 45, 40, 40, 45] },
            { name: "Electricidad", values: [80, 85, 80, 85, 80, 85, 80, 85, 80, 85, 80, 85] },
            { name: "Internet", values: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100] },
            { name: "Celular 01", values: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50] },
            { name: "Celular 02", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Celular Familia", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Luz Casa Madre", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Internet Casa Madre", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
        ]
    },
    {
        category: "Alimentación",
        subcategories: [
            { name: "Carnes", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Verduras", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Mercado General", values: [400, 400, 450, 400, 400, 450, 400, 400, 450, 400, 400, 500] },
            { name: "Comida para Mascotas", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Salidas a comer familiares", values: [150, 100, 200, 100, 150, 100, 200, 100, 150, 100, 200, 250] },
            { name: "Delivery", values: [80, 60, 90, 60, 80, 60, 90, 60, 80, 60, 90, 100] },
            { name: "Snacks y cafés", values: [40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40] },
            { name: "Bebidas no alcohólicas", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Gaseosas", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Licores", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Otros", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
        ]
    },
    {
        category: "Transporte",
        subcategories: [
            { name: "Combustible vehículo", values: [150, 150, 150, 150, 150, 150, 150, 150, 150, 150, 150, 150] },
            { name: "Mantenimiento", values: [0, 0, 300, 0, 0, 0, 0, 0, 300, 0, 0, 0] },
            { name: "Peaje", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Parqueadero", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Lavado", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "SOAT", values: [0, 0, 0, 0, 0, 120, 0, 0, 0, 0, 0, 0] },
            { name: "Seguros", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Transporte Público", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Taxis", values: [30, 20, 40, 20, 30, 20, 40, 20, 30, 20, 40, 50] },
            { name: "Pasajes de familia", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Vuelos", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Buses Interprovinciales", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
        ]
    },
    {
        category: "Gastos Personales",
        subcategories: [
            { name: "Ropa", values: [0, 0, 200, 0, 0, 0, 300, 0, 0, 0, 0, 400] },
            { name: "Zapatillas", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Accesorios", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Peluquería", values: [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30] },
            { name: "Gimnasio", values: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100] },
            { name: "Masajes", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Medicina", values: [50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Productos de Belleza", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Personal Trainer", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Dentista", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Varios", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
        ]
    },
    {
        category: "Entretenimiento",
        subcategories: [
            { name: "Cine", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Teatro", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Libros/revistas", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Fútbol / Deportes", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Suscripción a ligas de fútbol", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Salidas de hijos a fiestas", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Viajes de familia", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Vacaciones familiares", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Conciertos", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Salidas amigos", values: [100, 80, 120, 80, 100, 80, 120, 80, 100, 80, 120, 150] }
        ]
    },
    {
        category: "Mascotas",
        subcategories: [
            { name: "Alimento", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Veterinaria", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Medicamentos", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Guardería", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Peluquería", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Juguetes y accesorios", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Otros", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
        ]
    },
    {
        category: "Seguros",
        subcategories: [
            { name: "Vida", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Salud", values: [150, 150, 150, 150, 150, 150, 150, 150, 150, 150, 150, 150] },
            { name: "Hogar", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Seguro médico de viajes", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Otros", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
        ]
    },
    {
        category: "Educación",
        subcategories: [
            { name: "Pago de créditos educativos", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Matrícula / Pensión colegio", values: [0, 0, 300, 300, 300, 300, 300, 300, 300, 300, 300, 0] },
            { name: "Útiles", values: [0, 0, 150, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Libros", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Uniformes", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Suscripción revistas / periódicos", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Clubes académicos / tertulias", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Cursos de idiomas", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Otros", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
        ]
    },
    {
        category: "Ahorro Mensual",
        subcategories: [
            { name: "Aporte / AFP / Fondo Mutuo", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Meta de Ahorro Mensual 10%", values: [250, 250, 250, 250, 250, 250, 250, 250, 250, 250, 250, 250] },
            { name: "Ahorro en cuenta AFP", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Compra de dólares", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
        ]
    },
    {
        category: "Inversiones",
        subcategories: [
            { name: "Fondos mutuos / Acciones", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Mensualidades", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Acciones", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Inversiones Personales", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Inversión en Terceros", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Otros", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
        ]
    },
    {
        category: "Servicios Profesionales",
        subcategories: [
            { name: "Contador", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Abogado", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Mensajero", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Asistente personal", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Ahorro programado", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Otros (suscripciones a revistas)", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Otros", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
        ]
    },
    {
        category: "Pago de Créditos",
        subcategories: [
            { name: "Crédito personal", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Tarjeta de crédito", values: [150, 150, 150, 150, 150, 150, 150, 150, 150, 150, 150, 150] },
            { name: "Abono a Tarjetas de Crédito", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Penalidades", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Otros", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
        ]
    },
    {
        category: "Contribución",
        subcategories: [
            { name: "Diezmos, ofrendas, iglesia", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Apoyo a fundaciones", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Donaciones varias", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Dadivas en la calle o semáforos", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Apoyo a otro tipo de causas", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Otros", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
        ]
    },
    {
        category: "Contingencias",
        subcategories: [
            { name: "Urgencias médicas no cubiertas", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Emergencias familiares", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Decisiones no programadas", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Otros", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
        ]
    },
    {
        category: "Suscripciones",
        subcategories: [
            { name: "Suscripción de Apple", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Netflix", values: [40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40] },
            { name: "Zoom Premium", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Suscripción 1", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Suscripción 2", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
        ]
    },
    {
        category: "Ocasiones Especiales",
        subcategories: [
            { name: "Regalos Amigos", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Regalos Familia", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Aniversario", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
        ]
    }
];

export default function DashboardPage() {
    // --- ESTADO PARA ACORDEÓN ---
    const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

    const toggleCat = (catName: string) => {
        setExpandedCats(prev => ({ ...prev, [catName]: !prev[catName] }));
    };

    // --- CÁLCULOS PRINCIPALES ---
    const monthlyIncomeTotals = Array(12).fill(0);
    INCOMES.forEach(inc => {
        inc.values.forEach((v, i) => { monthlyIncomeTotals[i] += v; });
    });

    const monthlyExpenseTotals = Array(12).fill(0);
    EXPENSES.forEach(cat => {
        cat.subcategories.forEach(sub => {
            sub.values.forEach((v, i) => { monthlyExpenseTotals[i] += v; });
        });
    });

    const monthlyBalances = monthlyIncomeTotals.map((inc, i) => inc - monthlyExpenseTotals[i]);

    const grandTotalIncome = monthlyIncomeTotals.reduce((a, b) => a + b, 0);
    const grandTotalExpense = monthlyExpenseTotals.reduce((a, b) => a + b, 0);
    const grandTotalBalance = grandTotalIncome - grandTotalExpense;

    // --- PARA EL GRÁFICO CSS ---
    // Encontrar el valor máximo mensual para escalar el gráfico
    const maxMonthlyValue = Math.max(...monthlyIncomeTotals, ...monthlyExpenseTotals);

    // Helpers UI
    const formatSoles = (val: number) => {
        if (val === 0) return "-";
        return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <Appshell>
            <div className="flex flex-col gap-8 animate-fade-in-up pb-10 max-w-full">

                {/* 1. SECCIÓN SUPERIOR: TARJETAS DE RESUMEN GLOBAL */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-800 flex items-center gap-3">
                            <LayoutDashboard className="w-8 h-8 text-indigo-500" />
                            Inteligencia Financiera <span className="text-sm font-bold px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">2026</span>
                        </h1>
                        <p className="text-gray-500 mt-1 font-medium">
                            Análisis global y detalle interactivo de tu evolución económica.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Tarjeta Ingresos */}
                    <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-emerald-100 flex flex-col relative overflow-hidden group hover:shadow-emerald-100 transition-all">
                        <div className="absolute -right-10 -top-10 w-32 h-32 bg-emerald-50 rounded-full blur-2xl group-hover:bg-emerald-100 transition-all"></div>
                        <div className="flex justify-between items-start relative z-10">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Ingresos</p>
                                <h3 className="text-3xl font-black text-emerald-600">S/ {grandTotalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
                            </div>
                            <div className="p-3 bg-emerald-50 rounded-xl"><TrendingUp className="w-6 h-6 text-emerald-500" /></div>
                        </div>
                    </div>

                    {/* Tarjeta Egresos */}
                    <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-rose-100 flex flex-col relative overflow-hidden group hover:shadow-rose-100 transition-all">
                        <div className="absolute -right-10 -top-10 w-32 h-32 bg-rose-50 rounded-full blur-2xl group-hover:bg-rose-100 transition-all"></div>
                        <div className="flex justify-between items-start relative z-10">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Egresos</p>
                                <h3 className="text-3xl font-black text-rose-500">S/ {grandTotalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
                            </div>
                            <div className="p-3 bg-rose-50 rounded-xl"><TrendingDown className="w-6 h-6 text-rose-400" /></div>
                        </div>
                    </div>

                    {/* Tarjeta Saldo */}
                    <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-blue-100 flex flex-col relative overflow-hidden group hover:shadow-blue-100 transition-all">
                        <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-50 rounded-full blur-2xl group-hover:bg-blue-100 transition-all"></div>
                        <div className="flex justify-between items-start relative z-10">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Saldo Anual Neto</p>
                                <h3 className="text-3xl font-black text-blue-600">S/ {grandTotalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
                            </div>
                            <div className="p-3 bg-blue-50 rounded-xl"><Wallet className="w-6 h-6 text-blue-500" /></div>
                        </div>
                    </div>
                </div>

                {/* 2. SECCIÓN MEDIA: GRÁFICO INTERACTIVO MENSUAL */}
                <div className="bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col relative">
                    <div className="flex items-center gap-2 mb-8">
                        <BarChart3 className="w-5 h-5 text-indigo-400" />
                        <h2 className="text-lg font-bold text-gray-800">Evolución Mensual (Ingresos vs Egresos)</h2>
                    </div>

                    <div className="flex justify-between items-end h-48 gap-2 w-full px-2">
                        {months.map((m, i) => {
                            const incHeight = maxMonthlyValue > 0 ? (monthlyIncomeTotals[i] / maxMonthlyValue) * 100 : 0;
                            const expHeight = maxMonthlyValue > 0 ? (monthlyExpenseTotals[i] / maxMonthlyValue) * 100 : 0;

                            return (
                                <div key={`chart-${m}`} className="flex flex-col items-center flex-1 group">
                                    <div className="flex items-end justify-center w-full gap-1 h-full pb-3 border-b border-gray-100 relative">
                                        {/* TOOLTIP INTERACTIVO */}
                                        <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-[10px] p-2 rounded shadow-xl z-20 pointer-events-none flex flex-col gap-1 w-28 text-center">
                                            <span className="font-bold text-emerald-300">Ing: S/ {monthlyIncomeTotals[i].toLocaleString()}</span>
                                            <span className="font-bold text-rose-300">Egr: S/ {monthlyExpenseTotals[i].toLocaleString()}</span>
                                        </div>

                                        {/* BARRAS */}
                                        <div className="w-1/3 max-w-[12px] bg-emerald-400 rounded-t-sm hover:bg-emerald-300 transition-colors cursor-crosshair" style={{ height: `${incHeight}%` }}></div>
                                        <div className="w-1/3 max-w-[12px] bg-rose-400 rounded-t-sm hover:bg-rose-300 transition-colors cursor-crosshair" style={{ height: `${expHeight}%` }}></div>
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 mt-2 uppercase">{m}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 3. SECCIÓN INFERIOR: TABLA DRILL-DOWN (ACORDEÓN) */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col relative group/board">

                    <div className="bg-gray-50 px-6 py-5 flex justify-between items-center border-b border-gray-100">
                        <div className="font-black text-gray-800 text-lg flex items-center gap-2">
                            <Activity className="w-5 h-5 text-indigo-500" /> Detalle Estructural (Drill-Down)
                        </div>
                        <div className="text-xs text-gray-500 font-medium">
                            Haz clic en las categorías para ver u ocultar el detalle.
                        </div>
                    </div>

                    <div className="overflow-x-auto overflow-y-auto max-h-[60vh] custom-scrollbar relative">
                        <table className="w-full text-left border-collapse min-w-[1400px]">
                            <thead className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-sm">
                                <tr className="text-gray-500 text-xs font-bold uppercase tracking-widest border-b-2 border-gray-100">
                                    <th className="sticky left-0 bg-white/95 z-50 p-4 min-w-[280px] w-[320px] border-r border-gray-100 shadow-[4px_0_10px_rgba(0,0,0,0.02)]">
                                        Estructura Financiera
                                    </th>
                                    {months.map((m) => (
                                        <th key={m} className="p-4 min-w-[90px] text-center border-r border-gray-50">
                                            {m}
                                        </th>
                                    ))}
                                    <th className="p-4 min-w-[120px] text-right text-indigo-600 bg-indigo-50/30">
                                        TOTAL
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="text-sm font-medium">

                                {/* ====================== INGRESOS ====================== */}
                                <tr className="bg-emerald-50/50 hover:bg-emerald-50 transition-colors cursor-pointer group" onClick={() => toggleCat('Ingresos')}>
                                    <td className="sticky left-0 bg-emerald-50/90 backdrop-blur-sm z-30 p-3 pl-4 border-r border-gray-100 text-emerald-800 shadow-[4px_0_10px_rgba(0,0,0,0.02)] flex items-center gap-2 font-black uppercase text-xs">
                                        {expandedCats['Ingresos'] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                        TOTAL INGRESOS
                                    </td>
                                    {monthlyIncomeTotals.map((tot, i) => (
                                        <td key={`inc-tot-${i}`} className="p-3 text-center font-bold text-emerald-600 border-r border-gray-50 group-hover:bg-emerald-100/30 transition-colors">
                                            {formatSoles(tot)}
                                        </td>
                                    ))}
                                    <td className="p-3 text-right font-black text-emerald-700 bg-emerald-100/50">
                                        S/ {formatSoles(grandTotalIncome)}
                                    </td>
                                </tr>

                                {expandedCats['Ingresos'] && INCOMES.map((inc, i) => {
                                    const rowTotal = inc.values.reduce((a, b) => a + b, 0);
                                    return (
                                        <tr key={`inc-${i}`} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                            <td className="sticky left-0 bg-white backdrop-blur-sm z-10 p-3 pl-12 border-r border-gray-100 text-gray-600 text-xs shadow-[4px_0_10px_rgba(0,0,0,0.01)] flex items-center gap-2">
                                                <div className="w-1 h-1 rounded-full bg-emerald-300"></div>
                                                {inc.name}
                                            </td>
                                            {inc.values.map((v, j) => (
                                                <td key={`inc-v-${j}`} className="p-3 text-center text-gray-500 text-[11px]">
                                                    {formatSoles(v)}
                                                </td>
                                            ))}
                                            <td className="p-3 text-right font-bold text-gray-600 text-[11px] bg-gray-50/50">
                                                {formatSoles(rowTotal)}
                                            </td>
                                        </tr>
                                    );
                                })}

                                {/* SEPARADOR */}
                                <tr><td colSpan={14} className="h-4 bg-transparent border-y border-gray-100"></td></tr>

                                {/* ====================== EGRESOS ====================== */}
                                <tr className="bg-rose-50/50">
                                    <td colSpan={14} className="sticky left-0 z-30 p-3 pl-4 border-r border-gray-100 text-rose-800 font-black uppercase text-xs tracking-widest flex items-center gap-2 shadow-[4px_0_10px_rgba(0,0,0,0.02)]">
                                        <TrendingDown className="w-4 h-4" /> ESTRUCTURA DE GASTOS
                                    </td>
                                </tr>

                                {EXPENSES.map((cat, i) => {
                                    // Total for this category per month
                                    const catMonthlyTotals = Array(12).fill(0);
                                    cat.subcategories.forEach(sub => {
                                        sub.values.forEach((v, monthIdx) => {
                                            catMonthlyTotals[monthIdx] += v;
                                        });
                                    });
                                    const catGrandTotal = catMonthlyTotals.reduce((a, b) => a + b, 0);
                                    const isExpanded = expandedCats[`exp-${i}`];

                                    return (
                                        <React.Fragment key={`exp-cat-${i}`}>
                                            {/* CABECERA CATEGORIA (Colapsable) */}
                                            <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer group" onClick={() => toggleCat(`exp-${i}`)}>
                                                <td className="sticky left-0 bg-white group-hover:bg-gray-50 backdrop-blur-sm z-20 p-2.5 pl-6 font-bold text-gray-700 text-[11px] uppercase border-r border-gray-100 shadow-[4px_0_10px_rgba(0,0,0,0.02)] flex items-center gap-2 transition-colors">
                                                    {isExpanded ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
                                                    {cat.category}
                                                </td>
                                                {catMonthlyTotals.map((tot, j) => (
                                                    <td key={`cat-tot-${j}`} className="p-2.5 text-center text-[11px] font-semibold text-gray-600 border-r border-gray-50 group-hover:bg-rose-50/30 transition-colors">
                                                        {tot > 0 ? formatSoles(tot) : '-'}
                                                    </td>
                                                ))}
                                                <td className="p-2.5 text-right font-bold text-rose-600 text-[11px] bg-rose-50/30">
                                                    {catGrandTotal > 0 ? formatSoles(catGrandTotal) : '-'}
                                                </td>
                                            </tr>

                                            {/* SUBCATEGORIAS (Ocultas por defecto) */}
                                            {isExpanded && cat.subcategories.map((sub, j) => {
                                                const rowTotal = sub.values.reduce((a, b) => a + b, 0);
                                                return (
                                                    <tr key={`exp-sub-${j}`} className="border-b border-gray-50/50 hover:bg-gray-50/80 transition-colors">
                                                        <td className="sticky left-0 bg-white/95 backdrop-blur-sm z-10 p-2 pl-12 border-r border-gray-100 text-gray-500 text-[10px] shadow-[4px_0_10px_rgba(0,0,0,0.01)] flex items-center gap-2">
                                                            <div className="w-1 h-1 rounded-full bg-rose-300"></div>
                                                            {sub.name}
                                                        </td>
                                                        {sub.values.map((v, k) => (
                                                            <td key={`exp-v-${k}`} className="p-2 text-center text-gray-400 text-[10px] border-r border-gray-50/50 hover:bg-rose-50 transition-colors">
                                                                {formatSoles(v)}
                                                            </td>
                                                        ))}
                                                        <td className="p-2 text-right font-semibold text-rose-500 text-[10px] bg-rose-50/10">
                                                            {formatSoles(rowTotal)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </React.Fragment>
                                    );
                                })}

                                {/* TOTAL EGRESOS */}
                                <tr className="bg-rose-50/80 border-t-2 border-rose-100">
                                    <td className="sticky left-0 bg-rose-50/90 z-30 p-3 pl-4 font-black uppercase text-xs text-rose-800 border-r border-gray-100 shadow-[4px_0_10px_rgba(0,0,0,0.02)]">
                                        TOTAL EGRESOS
                                    </td>
                                    {monthlyExpenseTotals.map((tot, i) => (
                                        <td key={`exp-tot-f-${i}`} className="p-3 text-center font-bold text-rose-600 border-r border-gray-50">
                                            {formatSoles(tot)}
                                        </td>
                                    ))}
                                    <td className="p-3 text-right font-black bg-rose-100/80 text-rose-700 text-sm">
                                        S/ {formatSoles(grandTotalExpense)}
                                    </td>
                                </tr>

                                {/* SALDO FINAL REPETIDO */}
                                <tr className="bg-blue-50/80 border-t-4 border-white">
                                    <td className="sticky left-0 bg-blue-50/90 z-40 p-4 pl-4 font-black uppercase tracking-widest text-sm text-blue-900 border-r border-gray-100 shadow-[4px_0_10px_rgba(0,0,0,0.02)]">
                                        SALDO NETO MENSUAL
                                    </td>
                                    {monthlyBalances.map((bal, i) => (
                                        <td key={`bal-f-${i}`} className={`p-4 text-center font-black text-sm border-r border-gray-50 ${bal < 0 ? 'text-rose-500' : 'text-blue-600'}`}>
                                            {formatSoles(bal)}
                                        </td>
                                    ))}
                                    <td className="p-4 text-right font-black bg-blue-100 text-blue-800 text-lg shadow-inner">
                                        S/ {formatSoles(grandTotalBalance)}
                                    </td>
                                </tr>

                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </Appshell>
    );
}
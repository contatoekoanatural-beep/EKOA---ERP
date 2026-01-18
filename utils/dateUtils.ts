
/**
 * Returns { startDateTime, endDateTime } for a given period option.
 * All times are in local timezone.
 * 
 * Supported periods:
 * - 'hoje': 00:00:00 → 23:59:59 of current day
 * - 'amanha': 00:00:00 → 23:59:59 of next day
 * - 'ontem': 00:00:00 → 23:59:59 of previous day
 * - '7d_futuro': start of today → end of 7th day (including today)
 * - '7d_passado': start of 7th day before → end of today
 * - 'personalizado': returns empty strings (use getCustomPeriodRange instead)
 */
export const getPeriodRange = (period: string) => {
    const today = new Date(); // Local time

    // Helper to format as YYYY-MM-DDTHH:mm:ss (Local)
    const formatDateTime = (date: Date) => {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    };

    // Helper for Start of Day (00:00:00)
    const getStartOfDay = (date: Date) => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
    };

    // Helper for End of Day (23:59:59)
    const getEndOfDay = (date: Date) => {
        const d = new Date(date);
        d.setHours(23, 59, 59, 999);
        return d;
    };

    let startDateTime = '';
    let endDateTime = '';

    switch (period) {
        case 'hoje': {
            // HOJE: 00:00:00 → 23:59:59 do dia atual
            const start = getStartOfDay(today);
            const end = getEndOfDay(today);
            startDateTime = formatDateTime(start);
            endDateTime = formatDateTime(end);
            break;
        }
        case 'amanha': {
            // AMANHÃ: 00:00:00 → 23:59:59 do dia seguinte
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            const start = getStartOfDay(tomorrow);
            const end = getEndOfDay(tomorrow);
            startDateTime = formatDateTime(start);
            endDateTime = formatDateTime(end);
            break;
        }
        case 'ontem': {
            // ONTEM: 00:00:00 → 23:59:59 do dia anterior
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            const start = getStartOfDay(yesterday);
            const end = getEndOfDay(yesterday);
            startDateTime = formatDateTime(start);
            endDateTime = formatDateTime(end);
            break;
        }
        case '7d_futuro': {
            // PRÓXIMOS 7 DIAS: início do dia atual → final do 7º dia (incluindo hoje)
            const start = getStartOfDay(today);
            const endDay = new Date(today);
            endDay.setDate(today.getDate() + 6); // hoje + 6 = 7 dias incluindo hoje
            const end = getEndOfDay(endDay);
            startDateTime = formatDateTime(start);
            endDateTime = formatDateTime(end);
            break;
        }
        case '7d_passado': {
            // ÚLTIMOS 7 DIAS: início do 7º dia anterior → final de hoje
            const startDay = new Date(today);
            startDay.setDate(today.getDate() - 6); // hoje - 6 = 7 dias incluindo hoje
            const start = getStartOfDay(startDay);
            const end = getEndOfDay(today);
            startDateTime = formatDateTime(start);
            endDateTime = formatDateTime(end);
            break;
        }
        case 'personalizado':
        default:
            // PERSONALIZADO: retorna vazio, usar getCustomPeriodRange para datas específicas
            startDateTime = '';
            endDateTime = '';
            break;
    }

    return { startDateTime, endDateTime };
};

/**
 * Returns { startDateTime, endDateTime } for custom date range.
 * Covers full day (00:00:00 until 23:59:59) for each date.
 * 
 * @param startDate - YYYY-MM-DD format
 * @param endDate - YYYY-MM-DD format
 */
export const getCustomPeriodRange = (startDate: string, endDate: string) => {
    const formatDateTime = (date: Date) => {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    };

    let startDateTime = '';
    let endDateTime = '';

    if (startDate) {
        const [year, month, day] = startDate.split('-').map(Number);
        const start = new Date(year, month - 1, day, 0, 0, 0, 0);
        startDateTime = formatDateTime(start);
    }

    if (endDate) {
        const [year, month, day] = endDate.split('-').map(Number);
        const end = new Date(year, month - 1, day, 23, 59, 59, 999);
        endDateTime = formatDateTime(end);
    }

    return { startDateTime, endDateTime };
};


export const formatDate = (dateInput: string | Date | undefined | null): string => {
    if (!dateInput) return '--';

    try {
        // If it's a YYYY-MM-DD string (from date input), avoid timezone issues by simple split
        if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
            const [year, month, day] = dateInput.split('-');
            return `${day}/${month}/${year}`;
        }

        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return '--';

        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();

        return `${day}/${month}/${year}`;
    } catch (e) {
        console.error('Error formatting date:', e);
        return '--';
    }
};

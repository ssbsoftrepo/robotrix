import { Printer } from '@bcyesil/capacitor-plugin-printer';
import { Capacitor } from '@capacitor/core';

export const printCurrentPage = async (jobName: string = 'Document') => {
    if (Capacitor.isNativePlatform()) {
        try {

            const content = document.documentElement.outerHTML;

            await Printer.print({
                content: content,
                name: jobName
            });
        } catch (e) {
            console.error("Print failed", e);
        }
    } else {
        window.print();
    }
};

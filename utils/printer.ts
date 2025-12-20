import { Printer } from '@bcyesil/capacitor-plugin-printer';
import { Capacitor } from '@capacitor/core';

export const printCurrentPage = async (jobName: string = 'Document') => {
    if (Capacitor.isNativePlatform()) {
        try {
            // Get the HTML content of the page
            // We might want to target a specific element if possible, 
            // but for now printing the body is the standard approach for "Print Page".
            // However, we need to ensure the print styles are applied.
            // The plugin often takes raw HTML string.

            // NOTE: passing document.body.innerHTML might lose stylesheets linked in head.
            // A safer bet is often to pass the whole document.documentElement.outerHTML

            const content = document.documentElement.outerHTML;

            await Printer.print({
                content: content,
                name: jobName
            });
        } catch (e) {
            console.error("Print failed", e);
            // Fallback? Or just alert.
            // alert("Printing failed: " + (e instanceof Error ? e.message : String(e)));
        }
    } else {
        // Fallback for web
        window.print();
    }
};

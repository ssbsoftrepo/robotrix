import { Printer } from '@bcyesil/capacitor-plugin-printer';
import { Capacitor } from '@capacitor/core';

/**
 * Extracts all stylesheets and inline them for printing
 */
const getInlineStyles = (): string => {
    let styles = '';

    // Get all stylesheets
    const styleSheets = Array.from(document.styleSheets);

    for (const sheet of styleSheets) {
        try {
            if (sheet.cssRules) {
                const rules = Array.from(sheet.cssRules);
                for (const rule of rules) {
                    styles += rule.cssText + '\n';
                }
            }
        } catch (e) {
            // CORS issues with external stylesheets - skip
            console.warn('Could not access stylesheet:', sheet.href);
        }
    }

    // Also get inline <style> tags
    const styleTags = document.querySelectorAll('style');
    styleTags.forEach(tag => {
        styles += tag.innerHTML + '\n';
    });

    return styles;
};

/**
 * Creates a print-ready HTML document with inline styles
 */
const createPrintableHTML = (): string => {
    const styles = getInlineStyles();
    const bodyContent = document.body.innerHTML;

    // Add print-specific overrides
    const printStyles = `
        @media print {
            body, #root, main, .overflow-y-auto {
                background-color: white !important;
                color: black !important;
                overflow: visible !important;
                height: auto !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            
            .gemini-dark-card, .step-card {
                background-color: white !important;
                color: black !important;
                border: 1px solid #ccc !important;
            }
            
            h1, h2, h3, h4, h5, h6,
            .text-gray-100, .text-gray-200, .text-gray-300, .text-gray-400, .text-gray-500, .text-white {
                color: black !important;
            }
            
            .no-print, button, nav, header, #print-report-btn, .gemini-dark-button {
                display: none !important;
            }
            
            .print-break-inside-avoid {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
            }
            
            .print-grid-2 {
                display: grid !important;
                grid-template-columns: 1fr 1fr !important;
                gap: 1rem !important;
            }
            
            .print-break-before {
                break-before: page;
                page-break-before: always;
            }
            
            .print-text-black {
                color: black !important;
            }
            
            .print-image-container {
                height: 300px !important;
                max-height: 300px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                background-color: black !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            
            .print-image-container img {
                max-height: 100% !important;
                max-width: 100% !important;
                object-fit: contain !important;
            }
            
            .print-badge {
                color: white !important;
                background-color: black !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            
            .bg-noise {
                display: none !important;
            }
        }
        
        /* Force print styles to also apply outside @media print for plugin */
        body {
            background-color: white !important;
            color: black !important;
            font-family: 'Roboto', Arial, sans-serif !important;
        }
        
        button, nav, header, .no-print, #print-report-btn, .gemini-dark-button {
            display: none !important;
        }
        
        .bg-noise, [class*="blur-["] {
            display: none !important;
        }
        
        .bg-gradient-to-br, [class*="from-[#1E1E1E]"], [class*="to-[#121212]"],
        [class*="bg-[#1a1a1a]"], [class*="bg-[#1E1E1E]"], [class*="bg-[#121212]"],
        [class*="bg-[#252525]"], [class*="bg-[#2a2a2a]"] {
            background-color: white !important;
            background-image: none !important;
        }
        
        h1, h2, h3, h4, h5, h6,
        .text-gray-100, .text-gray-200, .text-gray-300, .text-gray-400, .text-gray-500, .text-white,
        [class*="text-[#E0E0E0]"] {
            color: black !important;
        }
        
        [class*="text-[#ff8fa3]"] {
            color: #8B0000 !important;
        }
        
        [class*="border-[#333333]"], [class*="border-[#6D282C]"] {
            border-color: #ccc !important;
        }
    `;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Robotrix Report</title>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Roboto+Condensed:wght@400;700&display=swap" rel="stylesheet">
    <style>
        ${styles}
        ${printStyles}
    </style>
</head>
<body>
    ${bodyContent}
</body>
</html>
    `.trim();
};

export const printCurrentPage = async (jobName: string = 'Document') => {
    if (Capacitor.isNativePlatform()) {
        try {
            const content = createPrintableHTML();

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

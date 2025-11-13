// Google Analytics 4 (GA4) tracking
declare var gtag: (...args: any[]) => void;

// Get GA4 tracking ID from config or window
function getGA4Id(): string | null {
    // Check if set in window (from config.js or inline script)
    if ((window as any).GA4_TRACKING_ID) {
        return (window as any).GA4_TRACKING_ID;
    }
    // Check if gtag is loaded and has a config
    if (typeof gtag !== 'undefined' && (window as any).dataLayer) {
        const dataLayer = (window as any).dataLayer;
        // Try to find the tracking ID from dataLayer
        for (let i = 0; i < dataLayer.length; i++) {
            if (dataLayer[i][0] === 'config' && dataLayer[i][1]) {
                return dataLayer[i][1];
            }
        }
    }
    return null;
}

export function gaEvent(category: string, action: string, label?: string, value?: string) {
    if (typeof gtag !== 'undefined') {
        const eventParams: any = {
            event_category: category,
            event_label: label,
        };
        if (value !== undefined) {
            eventParams.value = value;
        }
        gtag('event', action, eventParams);
    }
}

export function gaPageView(page: string) {
    if (typeof gtag !== 'undefined') {
        const trackingId = getGA4Id();
        if (trackingId) {
            gtag('config', trackingId, {
                page_path: page,
            });
        } else {
            // Fallback: just send page_view event
            gtag('event', 'page_view', {
                page_path: page,
            });
        }
    }
}

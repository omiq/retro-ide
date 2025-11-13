"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gaEvent = gaEvent;
exports.gaPageView = gaPageView;
// Get GA4 tracking ID from config or window
function getGA4Id() {
    // Check if set in window (from config.js or inline script)
    if (window.GA4_TRACKING_ID) {
        return window.GA4_TRACKING_ID;
    }
    // Check if gtag is loaded and has a config
    if (typeof gtag !== 'undefined' && window.dataLayer) {
        const dataLayer = window.dataLayer;
        // Try to find the tracking ID from dataLayer
        for (let i = 0; i < dataLayer.length; i++) {
            if (dataLayer[i][0] === 'config' && dataLayer[i][1]) {
                return dataLayer[i][1];
            }
        }
    }
    return null;
}
function gaEvent(category, action, label, value) {
    if (typeof gtag !== 'undefined') {
        const eventParams = {
            event_category: category,
            event_label: label,
        };
        if (value !== undefined) {
            eventParams.value = value;
        }
        gtag('event', action, eventParams);
    }
}
function gaPageView(page) {
    if (typeof gtag !== 'undefined') {
        const trackingId = getGA4Id();
        if (trackingId) {
            gtag('config', trackingId, {
                page_path: page,
            });
        }
        else {
            // Fallback: just send page_view event
            gtag('event', 'page_view', {
                page_path: page,
            });
        }
    }
}
//# sourceMappingURL=analytics.js.map
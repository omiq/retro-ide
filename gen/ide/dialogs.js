"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setWaitDialog = setWaitDialog;
exports.setWaitProgress = setWaitProgress;
exports.alertError = alertError;
exports.alertInfo = alertInfo;
exports.fatalError = fatalError;
const dompurify_1 = __importDefault(require("dompurify"));
/**
 * Remove any lingering modal backdrops
 */
function cleanupModalBackdrops() {
    // Remove any duplicate or orphaned backdrops
    const backdrops = $('.modal-backdrop');
    if (backdrops.length > 1) {
        // Keep only the last one, remove the rest
        backdrops.slice(0, -1).remove();
    }
    // Also remove any backdrops that are not associated with a visible modal
    $('.modal-backdrop').each(function () {
        const backdrop = $(this);
        // Check if there's a visible modal
        const visibleModals = $('.modal.in, .modal.show').length;
        if (visibleModals === 0) {
            backdrop.remove();
            $('body').removeClass('modal-open');
        }
    });
}
function setWaitDialog(b) {
    if (b) {
        cleanupModalBackdrops();
        setWaitProgress(0);
        $("#pleaseWaitModal").modal('show');
    }
    else {
        setWaitProgress(1);
        $("#pleaseWaitModal").modal('hide');
        // Clean up backdrop after modal hides (with a small delay to allow transition)
        setTimeout(() => {
            cleanupModalBackdrops();
        }, 350); // Bootstrap modal transition duration is 300ms
    }
}
function setWaitProgress(prog) {
    $("#pleaseWaitProgressBar").css('width', (prog * 100) + '%').show();
}
function alertError(s) {
    setWaitDialog(false);
    // Wait for Bootstrap modal to fully close before showing bootbox
    setTimeout(() => {
        cleanupModalBackdrops();
        bootbox.alert({
            title: '<span class="glyphicon glyphicon-alert" aria-hidden="true"></span> Alert',
            message: dompurify_1.default.sanitize(s)
        });
    }, 350);
}
function alertInfo(s) {
    setWaitDialog(false);
    // Wait for Bootstrap modal to fully close before showing bootbox
    setTimeout(() => {
        cleanupModalBackdrops();
        bootbox.alert(dompurify_1.default.sanitize(s));
    }, 350);
}
function fatalError(s) {
    alertError(s);
    throw new Error(s);
}
//# sourceMappingURL=dialogs.js.map
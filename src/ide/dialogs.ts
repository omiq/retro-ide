import DOMPurify from "dompurify";

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
    $('.modal-backdrop').each(function() {
        const backdrop = $(this);
        // Check if there's a visible modal
        const visibleModals = $('.modal.in, .modal.show').length;
        if (visibleModals === 0) {
            backdrop.remove();
            $('body').removeClass('modal-open');
        }
    });
}

export function setWaitDialog(b: boolean) {
    if (b) {
        cleanupModalBackdrops();
        setWaitProgress(0);
        $("#pleaseWaitModal").modal('show');
    } else {
        setWaitProgress(1);
        $("#pleaseWaitModal").modal('hide');
        // Clean up backdrop after modal hides (with a small delay to allow transition)
        setTimeout(() => {
            cleanupModalBackdrops();
        }, 350); // Bootstrap modal transition duration is 300ms
    }
}

export function setWaitProgress(prog: number) {
    $("#pleaseWaitProgressBar").css('width', (prog * 100) + '%').show();
}

export function alertError(s: string) {
    setWaitDialog(false);
    // Wait for Bootstrap modal to fully close before showing bootbox
    setTimeout(() => {
        cleanupModalBackdrops();
        bootbox.alert({
            title: '<span class="glyphicon glyphicon-alert" aria-hidden="true"></span> Alert',
            message: DOMPurify.sanitize(s)
        });
    }, 350);
}

export function alertInfo(s: string) {
    setWaitDialog(false);
    // Wait for Bootstrap modal to fully close before showing bootbox
    setTimeout(() => {
        cleanupModalBackdrops();
        bootbox.alert(DOMPurify.sanitize(s));
    }, 350);
}

export function fatalError(s: string) {
    alertError(s);
    throw new Error(s);
}


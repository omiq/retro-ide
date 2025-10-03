; BBC Micro startup code
; Simple startup that initializes the system and calls main()

        .export         _start
        .export         __STARTUP__: absolute = 1
        .import         _main
        .import         __STACKSIZE__

        .segment        "STARTUP"

_start:
        ; Initialize stack
        ldx     #$FF
        txs
        
        ; Clear keyboard buffer by reading any existing characters
        jsr     clear_keyboard_buffer
        
        ; Call main function
        jsr     _main
        
        ; If main returns, loop forever
loop:   jmp     loop

; Clear keyboard buffer
clear_keyboard_buffer:
        ; Read and discard any characters in the keyboard buffer
        ; This prevents the pre-filled CR from interfering with user input
        lda     #$81        ; OSBYTE function 81 - read character with timeout
        ldx     #$00        ; X=0 for immediate return (don't wait)
        jsr     $FFF4       ; Call OSBYTE
        bcs     clear_keyboard_buffer  ; If carry set, character was read, continue clearing
        rts                 ; No more characters, return

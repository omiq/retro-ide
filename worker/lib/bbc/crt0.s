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
        
        ; Call main function
        jsr     _main
        
        ; If main returns, loop forever
loop:   jmp     loop

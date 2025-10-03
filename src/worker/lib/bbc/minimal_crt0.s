; Minimal startup file for BBC Micro
; This provides the STARTUP segment that bbc.cfg expects
; without the problematic "jmp (abs)" code

.segment "STARTUP"
    ; Minimal startup - just jump to main
    jmp _main

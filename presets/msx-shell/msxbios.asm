; MSX BIOS function implementations for C programs
; This file provides C-callable wrappers for MSX BIOS functions

        .module msxbios
        .area   _CODE

; CLS - Clear screen
_CLS::
        call    0x00C3
        ret

; POSIT - Position cursor
; Parameters: row (A), col (H)
_POSIT::
        ld      a, 4(sp)    ; Get row parameter
        ld      h, 5(sp)    ; Get col parameter
        call    0x00C6
        ret

; CHPUT - Character output
; Parameter: character in A
_CHPUT::
        ld      a, 4(sp)    ; Get character parameter
        call    0x00A2
        ret

; CHGET - Character input
; Returns: character in A
_CHGET::
        call    0x009F
        ld      l, a        ; Return value in L
        ret

; GTSTCK - Get joystick status
_GTSTCK::
        ld      a, 4(sp)    ; Get stick parameter
        call    0x00D5
        ld      l, a        ; Return value in L
        ret

; GTTRIG - Get trigger status
_GTTRIG::
        ld      a, 4(sp)    ; Get trigger parameter
        call    0x00D8
        ld      l, a        ; Return value in L
        ret

; SNSMAT - Sense matrix
_SNSMAT::
        ld      a, 4(sp)    ; Get matrix parameter
        call    0x0141
        ld      l, a        ; Return value in L
        ret

; KILBUF - Clear keyboard buffer
_KILBUF::
        call    0x0156
        ret

; CALBAS - Call BASIC
_CALBAS::
        call    0x0159
        ret

; EXTROM - Call external ROM
_EXTROM::
        call    0x015F
        ret

; CHGCPU - Change CPU mode
_CHGCPU::
        ld      a, 4(sp)    ; Get mode parameter
        call    0x0180
        ret

; GETCPU - Get CPU mode
_GETCPU::
        call    0x0183
        ld      l, a        ; Return value in L
        ret

; PCMPLY - PCM play
_PCMPLY::
        call    0x0186
        ret

; PCMREC - PCM record
_PCMREC::
        call    0x0189
        ret

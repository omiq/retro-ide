; Pattern Demo in NASM for DOS
; Creates interesting geometric patterns

org 0x100    ; COM files are loaded at address 0x100

section .data
    msg db 'Pattern Demo - Press any key to exit', 13, 10, '$'

section .text
    global _start

_start:
    ; Print message
    mov ah, 09h
    mov dx, msg
    int 21h
    
    ; Set video mode to 13h (320x200, 256 colors)
    mov ax, 13h
    int 10h
    
    ; Create a checkerboard pattern
    mov dx, 0          ; Y coordinate
    
checker_y:
    mov cx, 0          ; X coordinate
    
checker_x:
    ; Calculate color based on position
    mov ax, cx
    add ax, dx
    and ax, 1          ; Check if even or odd
    jz checker_white
    mov al, 0          ; Black
    jmp checker_draw
    
checker_white:
    mov al, 15         ; White
    
checker_draw:
    mov ah, 0Ch
    int 10h
    
    add cx, 20         ; 20x20 squares
    cmp cx, 320
    jl checker_x
    
    add dx, 20
    cmp dx, 200
    jl checker_y
    
    ; Draw diagonal lines
    mov al, 4          ; Red color
    mov cx, 0          ; Start from top-left
    
diagonal:
    mov dx, cx         ; Y = X (diagonal)
    cmp dx, 200
    jge diagonal_done
    
    mov ah, 0Ch
    int 10h
    
    inc cx
    cmp cx, 320
    jl diagonal
    
diagonal_done:
    ; Draw another diagonal from top-right
    mov al, 2          ; Green color
    mov cx, 319        ; Start from top-right
    
diagonal2:
    mov dx, 319
    sub dx, cx         ; Y = 319 - X
    cmp dx, 200
    jge diagonal2_done
    
    mov ah, 0Ch
    int 10h
    
    dec cx
    cmp cx, 0
    jge diagonal2
    
diagonal2_done:
    ; Wait for keypress
    mov ah, 00h
    int 16h
    
    ; Return to text mode
    mov ax, 03h
    int 10h
    
    ; Exit program
    mov ah, 4Ch
    mov al, 0
    int 21h

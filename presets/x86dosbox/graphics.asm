; Graphics demo in NASM for DOS
; This program demonstrates VGA graphics programming

org 0x100    ; COM files are loaded at address 0x100

section .data
    msg db 'NASM Graphics Demo - Press any key to exit', 13, 10, '$'

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
    
    ; Draw some colored rectangles
    mov dx, 0          ; Y coordinate
draw_rect_loop:
    mov cx, 0          ; X coordinate
    mov al, dl         ; Color (based on Y coordinate)
    
draw_pixel_loop:
    ; Set pixel at (cx, dx) with color al
    mov ah, 0Ch
    int 10h
    
    inc cx
    cmp cx, 320
    jl draw_pixel_loop
    
    inc dx
    cmp dx, 200
    jl draw_rect_loop
    
    ; Draw some additional shapes
    ; Draw a red rectangle
    mov cx, 50         ; X start
    mov dx, 50         ; Y start
    mov al, 4          ; Red color
    
rect_loop_y:
    push cx
    push dx
    mov si, 0          ; X counter
    
rect_loop_x:
    mov ah, 0Ch
    int 10h
    inc cx
    inc si
    cmp si, 100        ; Width
    jl rect_loop_x
    
    pop dx
    pop cx
    inc dx
    cmp dx, 80         ; Y end
    jl rect_loop_y
    
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


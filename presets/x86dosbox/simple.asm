; Simple Graphics Demo in NASM for DOS
; Demonstrates basic VGA graphics with simple shapes

org 0x100    ; COM files are loaded at address 0x100

section .data
    msg db 'Simple Graphics Demo - Press any key to exit', 13, 10, '$'

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
    
    ; Draw a blue background
    mov dx, 0          ; Y coordinate
    mov al, 1          ; Blue color
    
bg_loop:
    mov cx, 0          ; X coordinate
    
bg_pixel_loop:
    mov ah, 0Ch
    int 10h
    inc cx
    cmp cx, 320
    jl bg_pixel_loop
    
    inc dx
    cmp dx, 200
    jl bg_loop
    
    ; Draw a yellow rectangle
    mov cx, 50         ; X start
    mov dx, 50         ; Y start
    mov al, 14         ; Yellow color
    
rect_y:
    push cx
    push dx
    mov si, 0          ; X counter
    
rect_x:
    mov ah, 0Ch
    int 10h
    inc cx
    inc si
    cmp si, 100        ; Width
    jl rect_x
    
    pop dx
    pop cx
    inc dx
    cmp dx, 100        ; Y end
    jl rect_y
    
    ; Draw a green rectangle
    mov cx, 170        ; X start
    mov dx, 50         ; Y start
    mov al, 2          ; Green color
    
rect2_y:
    push cx
    push dx
    mov si, 0          ; X counter
    
rect2_x:
    mov ah, 0Ch
    int 10h
    inc cx
    inc si
    cmp si, 100        ; Width
    jl rect2_x
    
    pop dx
    pop cx
    inc dx
    cmp dx, 100        ; Y end
    jl rect2_y
    
    ; Draw a red rectangle
    mov cx, 110        ; X start
    mov dx, 120        ; Y start
    mov al, 4          ; Red color
    
rect3_y:
    push cx
    push dx
    mov si, 0          ; X counter
    
rect3_x:
    mov ah, 0Ch
    int 10h
    inc cx
    inc si
    cmp si, 100        ; Width
    jl rect3_x
    
    pop dx
    pop cx
    inc dx
    cmp dx, 170        ; Y end
    jl rect3_y
    
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

; Hello World in NASM for DOS
; This program demonstrates basic NASM assembly programming

org 0x100    ; COM files are loaded at address 0x100

section .data
    msg db 'Hello World from NASM!', 13, 10, '$'
    msg_len equ $ - msg

section .text
    global _start

_start:
    ; DOS function 09h - Write string to stdout
    mov ah, 09h
    mov dx, msg
    int 21h
    
    ; DOS function 4Ch - Exit program
    mov ah, 4Ch
    mov al, 0
    int 21h

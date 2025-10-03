/* ANSI Escape Codes Test */
/* Tests the handling of ANSI escape codes in DOSBox */

#include <stdio.h>
#include <dos.h>
#include <conio.h>

/* Function to hide cursor using BIOS interrupt */
void hide_cursor() {
    union REGS regs;
    regs.h.ah = 0x01;  /* Set cursor type function */
    regs.h.ch = 0x20;  /* Hide cursor (bit 5 set) */
    regs.h.cl = 0x00;  /* Cursor scan line end */
    int86(0x10, &regs, &regs);
}

/* Function to show cursor using BIOS interrupt */
void show_cursor() {
    union REGS regs;
    regs.h.ah = 0x01;  /* Set cursor type function */
    regs.h.ch = 0x06;  /* Show cursor (normal) */
    regs.h.cl = 0x07;  /* Cursor scan line end */
    int86(0x10, &regs, &regs);
}

int main() {
    printf("\033[0H\033[2J [CLEAR] ");
    printf("Testing cursor control with BIOS calls:\n\n");
    printf("\033[23H\033[7;1;1mtest");
    printf("\033[5;20H\033[1;30;40m\033[1;33;41m HELLO! \033[1;37m");
    /* Test cursor hiding/showing with BIOS */
    printf("1. Hiding cursor with BIOS interrupt 0x10\n");
  
    printf("\033[0mNormal text\033[0m\n");
    printf("\n\033[1mNote\033[0m: Many ANSI cursor control codes don't work in DOSBox\n");
    printf("without a full DOS boot image. Use BIOS calls instead.\n");

  
    hide_cursor();
    printf("Cursor should be hidden now. Press any key...\n");
    getch();
    
    printf("2. Showing cursor with BIOS interrupt 0x10\n");
    show_cursor();
    printf("Cursor should be visible now. Press any key...\n");
    getch();
    
    /* Test ANSI codes that work in DOSBox */
    printf("3. Testing ANSI colors and formatting (these work):\n");
    printf("\033[31mRed text\033[0m\n");
    printf("\033[32mGreen text\033[0m\n");
    printf("\033[33mYellow text\033[0m\n");
    printf("\033[34mBlue text\033[0m\n");
    printf("\033[35mMagenta text\033[0m\n");
    printf("\033[36mCyan text\033[0m\n");
    printf("\033[1mBold text\033[0m\n");
    printf("\033[7mReverse video\033[0m\n");
    printf("\033[0mNormal text\033[0m\n");
        
    printf("\nPress any key to exit...\n");
    getch();
    
    return 0;
}

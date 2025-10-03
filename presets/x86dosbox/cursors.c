/* CONIO.H and cursor controlexample */

#include <stdio.h>
#include <conio.h>
#include <dos.h>
 
unsigned int key = 0;
char x=10;
char y=10;
char oldx,oldy;


void hide_cursor() {
    union REGS regs;
    regs.h.ah = 0x01;
    regs.h.ch = 0x20;  /* Hide cursor */
    regs.h.cl = 0x00;
    int86(0x10, &regs, &regs);
}

void show_cursor() {
    union REGS regs;
    regs.h.ah = 0x01;
    regs.h.ch = 0x06;  /* Show cursor */
    regs.h.cl = 0x07;
    int86(0x10, &regs, &regs);
}

int main()
{
    /* Clear Screen */
    clrscr();
 
    hide_cursor();
  
    /* Orange text */
    textattr(6);
  
    /* Loop until Q is pressed */
    while (key != 'Q')
    {
 
       
        /* keys; */
      	
        switch (key) 
        { 
            case 'w': 
            case 'W': 
                y--; 
                break; 
            case 'a':
            case 'A':
                x--; 
                break; 
            case 's':
            case 'S':
                y++; 
                break; 
            case 'd':
            case 'D':
                x++; 
                break; 
 
            default: 
                break; 
        }
      
      	if(oldx!=x || oldy!=y) {
          
          /* Delete the character */
          gotoxy(oldx,oldy);
          putch(' ');
          gotoxy(x,y);
          putch('@');
          oldx=x;
      	  oldy=y;
        }
 

      	key = getch();
     
    }
    
    /* Restore back to default */
    show_cursor();
    textattr(7);
    clrscr();
    puts("Cursor restored!");
    return(0);
}
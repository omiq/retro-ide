/* OUTPUTS THE PETSCII GRAPHIC SYMBOLS */
/* Equiv to BASIC CHR$(c)              */ 

#include <conio.h>
#include <stdio.h>
#include <stdlib.h>
#include <peekpoke.h>
#include <string.h>
#include <c64.h>
#include <cbm_petscii_charmap.h>

#include "common.h"
//#link "common.c"

void main(void) {
  
  int c,x,y;
  char col1 = 5;
  char col2 = 154;  
  clrscr();
  c=64;
  x=0;
  y=0;
  


  // Colours
  bordercolor(COLOR_BLUE);
  textcolor(COLOR_WHITE);

  // set character set to uppercase + graphics characters
  printf("%c",142);
  
  while(x<40) {
    if(c==128) c=160;
   
    gotoxy(x,y);
    printf("%c%c %c%d",col1,c,col2,c);
    
    
    if(c<255)
    {  
      c++;
    }
    else
    {

      break;
    }
  
    if(y<23)
    {  
      y++;
    }
    else
    {

      y=0;
      if(c<112) x+=5; else x+=6;
    }
  }
  
  c=cgetc();
  
}

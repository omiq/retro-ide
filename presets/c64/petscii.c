/* OUTPUTS THE PETSCII GRAPHIC SYMBOLS */
/* Equiv to BASIC CHR$(c) + POKEs      */ 

#include <conio.h>
#include <stdio.h>
#include <stdlib.h>
#include <peekpoke.h>
#include <string.h>
#include <c64.h>
#include <cbm_petscii_charmap.h>

#include "common.h"
//#link "common.c"

void petscii() {
  
  int c,x,y;
  
  // Foreground colours
  char col1 = 5;
  char col2 = 154;  

  // Initial Colours
  bordercolor(COLOR_BLUE);
  textcolor(COLOR_WHITE);

  // set character set to uppercase + graphics characters
  printf("%c",142);

 
  // ==================
  // CHR$ 64-255
  // ==================

  
  clrscr();
  c=64;
  x=0;
  y=0;
  
  
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

  // ==================
  // POKEs 0-127
  // ==================
  c=0;
  x=0;
  y=0;
  clrscr();
  
    while(x<40) {

   
    POKE(1024+(y*40+x),c);
    gotoxy(x+2,y);
    printf("%c%d",col1,c);
    
    
    if(c<127)
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
      if(c<96) x+=5; else x+=6;
    }
  }
  
  c=cgetc();
  
  // ==================
  // POKEs 128-255
  // ==================
  c=128;
  x=0;
  y=0;
  clrscr();
  
    while(x<40) {

   
    POKE(1024+(y*40+x),c);
    gotoxy(x+2,y);
    printf("%c%d",col2,c);
    
    
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
      x+=6;
    }
  }
  
  c=cgetc();
  
}

void main(void) {
  
 while(1) petscii();
 return;
}
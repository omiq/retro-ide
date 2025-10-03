#include <stdio.h>
#include <conio.h>
#include <peekpoke.h>
#include <cbm.h>

void main(void) {

  char c;
  
  while(1)
  {
      gotoxy(2,10);
      cputs("hello vic 20 world!\r");
      c++;
      if(c>=10) {c=1;}
      textcolor(c);
  }
  
  return;

}
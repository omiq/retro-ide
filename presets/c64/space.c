#include <conio.h>
#include <stdio.h>
#include <stdlib.h>
#include <peekpoke.h>
#include <string.h>
#include <c64.h>
#include <cbm_petscii_charmap.h>

#include "common.h"
//#link "common.c"

unsigned char map[20][20];
unsigned int r;
unsigned char c;
unsigned char x,y;

struct Player {
 int x;
 int y;
 bool alive;
 unsigned char power;
 unsigned char shields;
 unsigned char damage;
};

struct Player player;

void draw_system(int planets, int bases, int stars, int klingons) {

  int p;
  int b;
  int s;
  int k;
  clrscr();
  
  // Space debris and asteroids and such
  for(y=0; y<20; y++) {
    
    for(x=0; x<20; x++) {
      
      if((rand() % 20)==1) {
        map[y][x]='.';
      } 

    }
       
  };
  
  // planets and such
  for(p=0; p<planets; p++) {
    map[rand()%20][rand()%20]=119;
  }
  
  // base
  for(b=0; b<bases; b++) {  
      map[rand()%20][rand()%20]=193;
  }
    
  // stars
  for(s=0; s<stars; s++) {  
      map[rand()%20][rand()%20]='*';
  }  
 
  // klingons
  for(k=0; k<klingons; k++) {  
      map[rand()%20][rand()%20]='k';
  }  
  
  
  // Place the player
  map[player.x][player.y] = 'e';
  
  // draw grid
  gotoxy(0,0);
  puts("%%%%%%%%%%%%%%%%%%%%%%");
  
  for(y=0; y<20; y++) {
    
    gotoxy(0,y+1);
    putchar('%');
    
    for(x=0; x<20; x++) {
      
      	gotoxy(x+1,y+1);
    	putchar(map[y][x]);
    }
    
    gotoxy(21,y+1);
    putchar('%');

  };

  gotoxy(0,21);
  puts("%%%%%%%%%%%%%%%%%%%%%%");
  

}


void hud(void) {
  
  gotoxy(23, 1);
  printf("space battle game");

  gotoxy(23, 3);
  printf("power: %d",player.power);
  
  gotoxy(23, 4);  
  printf("shields: %d",player.shields);

  gotoxy(23, 5);
  printf("damage: %d",player.damage);
  
  
}


void init(void) {
  
  player.x = 10;
  player.y = 10;
  player.alive = true;
  player.power = 100;
  player.shields = 0;
  player.damage = 0;

  
}

void main(void) {

  bordercolor(COLOR_BLUE);
  textcolor(COLOR_WHITE);
  
  
  clrscr();
  
  // set character set to uppercase + graphics characters
  SET_VIC_BITMAP(0x1000);

  _randomize();
  r = rand()%3;
  
  init();
  draw_system(3,1,1,1);
  hud();
  
  cgetc();

}


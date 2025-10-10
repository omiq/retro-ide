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
 unsigned char current_system; 
 bool alive;
 unsigned char power;
 unsigned char shields;
 unsigned char damage;
};

struct System {
  int planets;
  int bases; 
  int stars; 
  int klingons;
  
};

struct Player player;

struct System galaxy[9*9];

void draw_system(int planets, int bases, int stars, int klingons) {

  int p;
  int b;
  int s;
  int k;
  char color;
  clrscr();
  
  // Space debris and asteroids and such
  for(y=0; y<20; y++) {
    
    for(x=0; x<20; x++) {
      
      if((rand() % 20)==1) {
        map[y][x]='.';
      } else { 
        map[y][x]=32;
      }

    }
       
  };
  
  // planets and such
  for(p=0; p<planets; p++) {
    map[rand()%20][rand()%20]=81;
  }
  
  // base
  for(b=0; b<bases; b++) {  
      map[rand()%20][rand()%20]=88;
  }
    
  // stars
  for(s=0; s<stars; s++) {  
      map[rand()%20][rand()%20]=42;
  }  
 
  // klingons
  for(k=0; k<klingons; k++) {  
      map[rand()%20][rand()%20]=86;
  }  
  
  
  // Place the player
  map[player.x][player.y] = 65;
  
  // Top border
  POKE(1024,79);
  POKE(1024+21,80);
  for(x=1; x<21; x++) {
    POKE(1024+(x),119);
  }
  
  // draw grid
  for(y=0; y<20; y++) {
    
    POKE(1024+((y+1)*40),116);
    
    for(x=0; x<20; x++) {
        
      	color = 1;
      
        if(map[y][x]==81) { 
          if((y*x) % 2)color = 14; else color = 13;
        }
      
        if(map[y][x]==86) color = 10;  
        if(map[y][x]==42) color = 7;
        if(map[y][x]==88) color = 15;
      
      	POKE(55296+((y+1)*40+(x+1)),color);
    	POKE(1024+((y+1)*40+(x+1)),(map[y][x]));
    }
    
    POKE(1024+((y+1)*40+21),103);

  };

  // Bottom border
  POKE(1024+840,76);
  POKE(1024+861,122);
  for(x=1; x<21; x++) {

    POKE(1024+(840+x),111);
  }
  

}

void lrs(void) {
  
  unsigned char lrsA, lrsB, lrsC, lrsD, lrsE, lrsF, lrsG, lrsH, lrsI;
  
  lrsA = player.current_system-10;
  lrsB = player.current_system-9;
  lrsC = player.current_system-8;

  lrsD = player.current_system-1;
  lrsE = player.current_system;
  lrsF = player.current_system+1;
  
  lrsG = player.current_system+8;
  lrsH = player.current_system+9;
  lrsI = player.current_system+10;
  
  // LRS
  gotoxy(23, 10);
  printf("%clong range scan%c",30,1);
  gotoxy(23, 11);  
  printf("%c%c               %c",18,31,146);  
  gotoxy(23, 12);
  printf("%c%c %d%d%d %c",18,31,galaxy[lrsA].klingons,galaxy[lrsA].bases,galaxy[lrsA].stars,146);
  printf("%c%c %d%d%d %c",18,31,galaxy[lrsB].klingons,galaxy[lrsB].bases,galaxy[lrsB].stars,146);
  printf("%c%c %d%d%d %c",18,31,galaxy[lrsC].klingons,galaxy[lrsC].bases,galaxy[lrsC].stars,146);
  gotoxy(23, 13);
  printf("%c%c               %c",18,31,146);  
  gotoxy(23, 14);
  printf("%c%c %d%d%d %c",18,31,galaxy[lrsD].klingons,galaxy[lrsD].bases,galaxy[lrsD].stars,146);
  printf("%c%c %d%d%d %c",18,31,galaxy[lrsE].klingons,galaxy[lrsE].bases,galaxy[lrsE].stars,146);
  printf("%c%c %d%d%d %c",18,31,galaxy[lrsF].klingons,galaxy[lrsF].bases,galaxy[lrsF].stars,146);
  gotoxy(23, 15);
  printf("%c%c               %c",18,31,146);  
  gotoxy(23, 16);
  printf("%c%c %d%d%d %c",18,31,galaxy[lrsG].klingons,galaxy[lrsG].bases,galaxy[lrsG].stars,146);
  printf("%c%c %d%d%d %c",18,31,galaxy[lrsH].klingons,galaxy[lrsH].bases,galaxy[lrsH].stars,146);
  printf("%c%c %d%d%d %c",18,31,galaxy[lrsI].klingons,galaxy[lrsI].bases,galaxy[lrsI].stars,146);
  gotoxy(23, 17);  
  printf("%c%c               %c",18,31,146);  
   
  
}

void hud(void) {
  
  
  gotoxy(23, 1);
  printf("%cspace battle game%c",18,146);

  gotoxy(23, 3);
  printf("%cpower%c: %d",154,5,player.power);
  
  gotoxy(23, 4);  
  printf("%cshields%c: %d",154,5,player.shields);

  gotoxy(23, 5);
  printf("%cdamage%c: %d",154,5,player.damage);

  gotoxy(23, 7);
  printf("%clocation%c: %d",154,5,player.current_system);

  lrs();
  
  printf("%c",5);
 
}


void srs() {
  
  int planets = galaxy[player.current_system].planets;
  int bases = galaxy[player.current_system].bases; 
  int stars = galaxy[player.current_system].stars; 
  int klingons = galaxy[player.current_system].klingons;
  
  draw_system(planets,bases,stars,klingons);
  
}

void init(void) {
  
  // Fill the galaxy
  unsigned char total_systems = sizeof(galaxy);
  
  // Iterate and randomize
  unsigned char this_system;
  for(this_system = 0; this_system < total_systems; this_system++) {
   	galaxy[this_system].planets = rand() % 9;
   	galaxy[this_system].bases = rand() % 2;
   	galaxy[this_system].stars = rand() % 2;
   	galaxy[this_system].klingons = rand() % 3;
    	//printf("generated system %d\n",this_system);
    
  }
  
  player.x = 10;
  player.y = 10;
  player.alive = true;
  player.power = 100;
  player.shields = 0;
  player.damage = 0;
  player.current_system = 36;

  
}

void main(void) {

  // set character set to uppercase + graphics characters
  SET_VIC_BITMAP(0x1000);
  bgcolor(COLOR_BLACK);
  bordercolor(COLOR_BLACK);
  textcolor(COLOR_WHITE);


  clrscr();  
  while(1) {


    _randomize();
    r = rand()%3;

    init();
    srs();
    hud();

    cgetc();
    
  }
}


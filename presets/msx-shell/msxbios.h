/*
 * MSX BIOS Header File
 * MSX-Shell Platform
 * RetroGameCoders.com 2025
 */

#ifndef MSXBIOS_H
#define MSXBIOS_H

/* MSX BIOS Function Addresses */
#define CLS_ADDR     0x00C3    /* Clear screen */
#define POSIT_ADDR   0x00C6    /* Position cursor */
#define CHPUT_ADDR   0x00A2    /* Character output */
#define CHGET_ADDR   0x009F    /* Character input */
#define GTSTCK_ADDR  0x00D5    /* Get joystick status */
#define GTTRIG_ADDR  0x00D8    /* Get trigger status */
#define SNSMAT_ADDR  0x0141    /* Sense matrix */
#define KILBUF_ADDR  0x0156    /* Clear keyboard buffer */
#define CALBAS_ADDR  0x0159    /* Call BASIC */
#define EXTROM_ADDR  0x015F    /* Call external ROM */
#define CHGCPU_ADDR  0x0180    /* Change CPU mode */
#define GETCPU_ADDR  0x0183    /* Get CPU mode */
#define PCMPLY_ADDR  0x0186    /* PCM play */
#define PCMREC_ADDR  0x0189    /* PCM record */

/* Screen modes */
#define SCREEN0 0x00      /* Text mode */
#define SCREEN1 0x01      /* Graphics mode 1 */
#define SCREEN2 0x02      /* Graphics mode 2 */
#define SCREEN3 0x03      /* Graphics mode 3 */

/* Colors */
#define BLACK   0x00
#define GREEN   0x01
#define LIGHT_GREEN 0x02
#define BLUE    0x03
#define LIGHT_BLUE 0x04
#define RED     0x05
#define LIGHT_RED 0x06
#define YELLOW  0x07
#define WHITE   0x07

/* Function prototypes for C compatibility */
void CLS(void);
void POSIT(unsigned char row, unsigned char col);
void CHPUT(unsigned char ch);
unsigned char CHGET(void);

/* Function prototypes for other BIOS functions */
unsigned char GTSTCK(unsigned char stick);
unsigned char GTTRIG(unsigned char trigger);
unsigned char SNSMAT(unsigned char matrix);
void KILBUF(void);
void CALBAS(void);
void EXTROM(void);
void CHGCPU(unsigned char mode);
unsigned char GETCPU(void);
void PCMPLY(unsigned char *data, unsigned int length);
void PCMREC(unsigned char *data, unsigned int length);

/* Screen control functions */
void set_screen_mode(unsigned char mode);
void set_color(unsigned char foreground, unsigned char background);
void draw_pixel(unsigned char x, unsigned char y, unsigned char color);
void draw_line(unsigned char x1, unsigned char y1, unsigned char x2, unsigned char y2, unsigned char color);
void draw_circle(unsigned char x, unsigned char y, unsigned char radius, unsigned char color);

/* Sound functions */
void play_tone(unsigned int frequency, unsigned int duration);
void play_music(unsigned char *notes, unsigned int length);
void stop_sound(void);

/* Input functions */
unsigned char get_key(void);
unsigned char get_joystick(unsigned char stick);
unsigned char get_trigger(unsigned char trigger);

/* Utility functions */
void delay(unsigned int ms);
void randomize(void);
unsigned int random(unsigned int max);

#endif /* MSXBIOS_H */

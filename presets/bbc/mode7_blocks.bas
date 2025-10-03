10 REM MODE 7 block graphics (sixels) demo
20 MODE 7:CLS
30 PRINT "       MODE 7 BLOCK GRAPHICS DEMO"
40 B$=CHR$(255):PRINT CHR$(153);CHR$(8);STRING$(39,B$)
50 PRINT
60 PRINT "  ";CHR$(136);CHR$(252);CHR$(137);"   [Blue Box:";CHR$(148)
70 REM Each sixel char is a 2x3 block pattern. 247=top+bottom rows on, 251=full col on
80 REM Draw a simple red rectangle using sixels
90 PRINT CHR$(148);CHR$(183);CHR$(163);CHR$(163);CHR$(163);CHR$(235)
100 FOR R=1 TO 3: PRINT CHR$(148);CHR$(181);SPC(3);CHR$(234): NEXT
110 PRINT CHR$(148);CHR$(245);CHR$(240);CHR$(240);CHR$(240);CHR$(250)
120 PRINT
130 REM Switch to white graphics and fill a checker row
140 PRINT "White pattern row:";CHR$(151)
150 FOR C=0 TO 15: PRINT CHR$(151);CHR$(160 + (C AND 7)); : NEXT : PRINT
170 REM Cycle through all graphics colors with a bar
180 FOR col=145 TO 151
190 PRINT "Colour ";col;":";CHR$(col);
200 FOR c=0 TO 15: PRINT CHR$(240); : NEXT : PRINT
210 NEXT
220 PRINT
230 PRINT "Tip: Use CHR$(145..151) to set graphics color. ";
240 PRINT "Sixel codes are CHR$(160..191) + CHR$(224..255)."
250 PRINT:PRINT "Press any key...";:A$=GET$
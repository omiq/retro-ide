10 REM DROP SHADOW EFFECT
20 MODE2 : FOR C=1 TO 8: 
30 PRINT FNshad(C,C-1,"BBC"); " "; FNshad(C-1,C,"BBC"): PRINT  
40 NEXT C
50 VDU 5: REM Graphics Text Mode On
60 GCOL 0,1: MOVE 200,400: PRINT "Graphics Text"               
70 GCOL 0,7: MOVE 208,392: PRINT "Graphics Text"
80 END
90 REM Handy function to make it more convenient:
100 DEFFNshad(c1%,c2%,text$):LOCALA%,mode%,fact%,v%,p%
110 A%=&87:mode%=(USR(&FFF4)AND&FF0000)DIV&10000
120 p%=POS:v%=VPOS:IFmode%=1THENfact%=32ELSEfact%=64
130 VDU5:GCOL0,c2%:MOVEp%*fact%-4*(fact%DIV32),((32-v%)*32-1)-4
140 PRINTtext$:GCOL0,c1%:MOVEp%*fact%,(32-v%)*32-1:PRINTtext$
150 VDU4,31,p%+LEN(text$),v%:=""
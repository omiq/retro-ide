REM Graphics Demo in QBASIC
SCREEN 12
CLS

REM Draw some shapes
CIRCLE (320, 240), 100, 15
LINE (100, 100)-(540, 380), 12, B
LINE (200, 200)-(440, 280), 10, BF

REM Draw some text
LOCATE 10, 20
PRINT "QBASIC Graphics Demo"
LOCATE 12, 20
PRINT "Circles, lines, and boxes!"

REM Wait for key press
LOCATE 20, 20
PRINT "Press any key to exit..."
SLEEP
SYSTEM
